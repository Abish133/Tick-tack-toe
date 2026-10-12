import {randomBytes,verify} from 'node:crypto';
import {db} from './db.mjs';
import {fail,hashToken} from './security.mjs';
import {walletCredit} from './players.mjs';

export const adCoinReward=25;
export function admobConfigured(env=process.env) {return /^ca-app-pub-\d+\/\d+$/.test(env.ADMOB_REWARDED_AD_UNIT_ID||'');}
let cachedKeys=null,keyExpiry=0,lastKeyFetch=0,keyFetch=null;
export async function googleAdmobKeys({fetcher=fetch,now=Date.now(),force=false}={}) {
  if(!force&&cachedKeys&&keyExpiry>now)return cachedKeys;
  if(force&&cachedKeys&&now-lastKeyFetch<60000)return cachedKeys;
  if(keyFetch)return keyFetch;
  fail(now-lastKeyFetch>=5000,'AD_VERIFICATION_UNAVAILABLE','Ad verification will retry shortly.',503);
  lastKeyFetch=now;
  keyFetch=(async()=>{
    const response=await fetcher('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(10000)});
    fail(response.ok,'AD_VERIFICATION_UNAVAILABLE','Ad verification keys are unavailable.',503);
    const data=await response.json();fail(Array.isArray(data.keys)&&data.keys.length>0&&data.keys.length<30,'AD_VERIFICATION_UNAVAILABLE','Ad verification keys are invalid.',503);
    const keys=new Map(data.keys.filter(k=>k.pem&&String(k.keyId).match(/^\d{1,12}$/)).map(k=>[String(k.keyId),k.pem]));
    fail(keys.size,'AD_VERIFICATION_UNAVAILABLE','No ad verification keys were available.',503);
    cachedKeys=keys;keyExpiry=now+3600000;return keys;
  })();
  try{return await keyFetch;}finally{keyFetch=null;}
}
export function verifyAdmobCallback(rawUrl,keys,now=Date.now()) {
  const raw=rawUrl.slice(rawUrl.indexOf('?')+1);const marker=raw.indexOf('&signature=');
  fail(rawUrl.includes('?')&&marker>0&&raw.length<=8192,'AD_SIGNATURE','Invalid ad callback.',403);
  const content=raw.slice(0,marker),tail=raw.slice(marker+1);
  fail(/^signature=[^&]+&key_id=\d{1,12}$/.test(tail),'AD_SIGNATURE','Signature parameters must end the callback.',403);
  const params=new URLSearchParams(raw);const all=[...params.keys()];
  fail(all.length===new Set(all).size,'AD_SIGNATURE','Duplicate callback parameters are not allowed.',403);
  const key=keys.get(params.get('key_id'));fail(key,'AD_SIGNATURE','Unknown ad signing key.',403);
  let valid=false;try{valid=verify('sha256',Buffer.from(content),key,Buffer.from(params.get('signature'),'base64url'));}catch{}
  fail(valid,'AD_SIGNATURE','Ad callback signature is invalid.',403);
  let at=Number(params.get('timestamp'));if(at>1e14)at/=1000;
  fail(Number.isFinite(at)&&Math.abs(now-at)<=86400000,'AD_EXPIRED','Ad callback timestamp is outside its delivery window.',403);
  fail(/^[A-Za-z0-9_-]{8,100}$/.test(params.get('transaction_id')||'')&&params.get('custom_data')&&params.get('user_id'),'AD_CALLBACK','Ad callback identifiers are missing.',403);
  return Object.fromEntries(params);
}
async function nonRanked(userId) {
  const user=await db.user.findUnique({where:{id:userId},include:{activeMatch:{select:{mode:true}}}});
  fail(user&&!user.suspended,'FORBIDDEN','This player cannot receive ad rewards.',403);
  const queue=globalThis.__elementalArena?.queueStatus(userId);
  fail(user.activeMatch?.mode!=='ranked'&&!(queue?.queued&&queue.mode==='ranked'),'RANKED_ADS','Rewarded ads are available outside Ranked only.',409);
  return user;
}
export async function startAdReward(userId,{env=process.env}={}) {
  fail(admobConfigured(env),'ADS_UNAVAILABLE','Rewarded ads are not configured yet.',503);await nonRanked(userId);
  const today=new Date();today.setUTCHours(0,0,0,0);
  return db.$transaction(async tx=>{
    // Lock this wallet row so parallel clicks cannot bypass the daily cap.
    await tx.$queryRaw`SELECT userId FROM CurrencyWallet WHERE userId=${userId} FOR UPDATE`;
    const count=await tx.adRewardSession.count({where:{userId,createdAt:{gte:today},OR:[{grantedAt:{not:null}},{expiresAt:{gt:new Date()}}]}});
    fail(count<5,'AD_DAILY_LIMIT','You have reached today’s five-ad limit.',409);
    const token=randomBytes(32).toString('base64url');
    const session=await tx.adRewardSession.create({data:{userId,tokenHash:hashToken(token),adUnit:env.ADMOB_REWARDED_AD_UNIT_ID,coins:adCoinReward,expiresAt:new Date(Date.now()+15*60000)}});
    return {sessionId:session.id,userId,customData:token,adUnit:session.adUnit,coins:session.coins,expiresAt:session.expiresAt};
  });
}
export async function adRewardStatus(userId,id) {
  const session=await db.adRewardSession.findFirst({where:{id,userId}});fail(session,'NOT_FOUND','Your ad reward session was not found.',404);
  return {sessionId:id,status:session.grantedAt?'granted':session.expiresAt<=new Date()?'expired':'pending',coins:session.grantedAt?session.coins:0};
}
export async function grantVerifiedAdReward(params,{env=process.env}={}) {
  fail(admobConfigured(env),'ADS_UNAVAILABLE','Rewarded ads are not configured.',503);
  const session=await db.adRewardSession.findUnique({where:{tokenHash:hashToken(params.custom_data)}});
  fail(session&&session.userId===params.user_id,'AD_CALLBACK','Ad session does not belong to this player.',403);
  fail(params.ad_unit===(env.ADMOB_SSV_AD_UNIT_ID||session.adUnit.split('/')[1]),'AD_CALLBACK','Ad unit does not match this reward session.',403);
  if(session.grantedAt)return {ok:true,duplicate:true};
  fail(session.expiresAt>new Date(),'AD_EXPIRED','This reward session has expired.',403);
  await nonRanked(session.userId);
  return db.$transaction(async tx=>{
    const changed=await tx.adRewardSession.updateMany({where:{id:session.id,grantedAt:null,expiresAt:{gt:new Date()}},data:{grantedAt:new Date(),transactionId:params.transaction_id}});
    if(!changed.count)return {ok:true,duplicate:true};
    await walletCredit(tx,session.userId,session.coins,'admob_reward',`admob:${params.transaction_id}`);
    return {ok:true,coins:session.coins};
  });
}
export async function admobCallback(rawUrl,options={}) {
  fail(admobConfigured(options.env||process.env),'ADS_UNAVAILABLE','Rewarded ads are not configured.',503);
  let keys=await googleAdmobKeys(options),params;
  const keyId=new URL(rawUrl).searchParams.get('key_id');
  if(!keys.has(keyId))keys=await googleAdmobKeys({...options,force:true});
  params=verifyAdmobCallback(rawUrl,keys);return grantVerifiedAdReward(params,options);
}
