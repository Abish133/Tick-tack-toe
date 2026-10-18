import {db} from './db.mjs';
import {randomBytes,randomUUID} from 'node:crypto';
import {RANKED_POWER_IDS,DEFAULT_LOADOUT} from '../lib/game-engine/powers.js';
import {fail,cleanText,passwordHash,verifyPassword,AppError,dateKey} from './security.mjs';
import {premiumTiers,passCoinPrice,checkoutConfigured} from './commerce-policy.mjs';

export const starterPowers=[...RANKED_POWER_IDS];
export const defaultLoadout=[...DEFAULT_LOADOUT];
export const playerInclude={profile:true,settings:true,stats:true,rating:true,wallet:true,loadout:{include:{slots:{orderBy:{position:'asc'}}}}};
const include=playerInclude;
export function publicPlayer(user){if(!user)return null;return {id:user.id,name:user.name,email:user.email,guest:user.guest,role:user.role,cups:user.rating?.cups||0,rating:user.rating?{cups:user.rating.cups,peakCups:user.rating.peakCups,rankedWins:user.rating.rankedWins,rankedLosses:user.rating.rankedLosses,rankedDraws:user.rating.rankedDraws}:null,coins:user.wallet?.coins||0,level:user.profile?.level||1,xp:user.profile?.xp||0,loadout:user.loadout?.slots.map(s=>s.powerId)||defaultLoadout,profile:user.profile,settings:user.settings,stats:user.stats,createdAt:user.createdAt};}
export async function getPlayer(id){return publicPlayer(await db.user.findUnique({where:{id},include}));}
export async function createPlayer({email,password,name,guest=false}){
  name=guest&&(name==null||name==='')?'Spark '+randomBytes(6).toString('hex'):cleanText(name,2,20);
  fail(name,'VALIDATION','Use a unique player name between 2 and 20 characters.');
  let normalizedEmail=null;
  if(!guest){normalizedEmail=typeof email==='string'?email.trim().toLowerCase():'';fail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)&&normalizedEmail.length<=191,'VALIDATION','Enter a valid email address.');fail(typeof password==='string'&&password.length>=10&&password.length<=128,'VALIDATION','Use a password between 10 and 128 characters.');}
  const hash=guest?null:await passwordHash(password);
  return db.user.create({data:{name,email:normalizedEmail,passwordHash:hash,guest,role:'PLAYER',profile:{create:{}},settings:{create:{}},stats:{create:{}},rating:{create:{}},wallet:{create:{}},powers:{create:starterPowers.map(powerId=>({powerId}))},loadout:{create:{slots:{create:defaultLoadout.map((powerId,position)=>({powerId,position}))}}},inventory:{create:['avatar-void','board-void','marks-neon'].map(cosmeticId=>({cosmeticId}))}},include});
}
export async function loginPlayer(email,password){const normalized=typeof email==='string'?email.trim().toLowerCase():'';fail(typeof password==='string'&&password.length<=128,'INVALID_CREDENTIALS','Email or password is incorrect.',401);const user=await db.user.findUnique({where:{email:normalized}});const valid=user?.passwordHash?await verifyPassword(password,user.passwordHash):await verifyPassword(password,'scrypt$16384$00000000000000000000000000000000$'+'0'.repeat(128));fail(user&&valid&&!user.suspended,'INVALID_CREDENTIALS','Email or password is incorrect.',401);return user;}
export async function upgradeGuest(userId,{name,email,password}){const normalizedEmail=typeof email==='string'?email.trim().toLowerCase():'';fail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)&&normalizedEmail.length<=191,'VALIDATION','Enter a valid email address.');fail(typeof password==='string'&&password.length>=10&&password.length<=128,'VALIDATION','Use a password between 10 and 128 characters.');const playerName=cleanText(name,2,20);fail(playerName,'VALIDATION','Use a unique player name between 2 and 20 characters.');const hash=await passwordHash(password);await db.$transaction(async tx=>{const user=await tx.user.findUnique({where:{id:userId}});fail(user?.guest,'NOT_GUEST','This account is already registered.',409);await tx.user.update({where:{id:userId},data:{guest:false,name:playerName,email:normalizedEmail,passwordHash:hash}});await tx.session.deleteMany({where:{userId}});});return db.user.findUnique({where:{id:userId}});}
export async function equipCosmetic(userId,cosmeticId){
  fail(cleanText(cosmeticId,1,80),'VALIDATION','Choose a cosmetic to equip.');
  await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT userId FROM CurrencyWallet WHERE userId=${userId} FOR UPDATE`;
    const own=await tx.playerInventory.findUnique({where:{userId_cosmeticId:{userId,cosmeticId}},include:{cosmetic:true}});
    fail(own,'NOT_OWNED','You do not own this cosmetic.');
    const field={avatar:'avatar',board:'equippedBoard',marks:'equippedMark',title:'title',effect:'equippedEffect',frame:'equippedFrame',banner:'equippedBanner',arena:'equippedArena',emote:'equippedEmote'}[own.cosmetic.type];
    fail(field,'COSMETIC_TYPE','This cosmetic cannot be equipped.');
    await tx.playerProfile.update({where:{userId},data:{[field]:field==='title'?own.cosmetic.name:cosmeticId}});
  },{isolationLevel:'ReadCommitted'});
  return getPlayer(userId);
}
export async function updateProfile(userId,body){const changes={};if('name'in body){changes.name=cleanText(body.name,2,20);fail(changes.name,'VALIDATION','Use a unique name containing 2–20 characters.');}const profile={};for(const [key,max]of[['bio',200],['region',20]])if(key in body){fail(typeof body[key]==='string'&&body[key].length<=max,'VALIDATION',`${key} is too long.`);profile[key]=body[key].trim();}if(profile.region)fail(/^[A-Z][A-Z0-9-]{1,19}$/.test(profile.region),'VALIDATION','Use an uppercase region code such as IN, EU or GLOBAL.');
  await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT userId FROM CurrencyWallet WHERE userId=${userId} FOR UPDATE`;
    for(const [field,type]of[['avatar','avatar'],['equippedBoard','board'],['equippedMark','marks'],['title','title'],['equippedEffect','effect'],['equippedFrame','frame'],['equippedBanner','banner'],['equippedArena','arena'],['equippedEmote','emote']])if(field in body){const own=await tx.playerInventory.findUnique({where:{userId_cosmeticId:{userId,cosmeticId:String(body[field])}},include:{cosmetic:true}});fail(own&&own.cosmetic.type===type,'NOT_OWNED','That cosmetic is not in your inventory.');profile[field]=field==='title'?own.cosmetic.name:own.cosmeticId;}
    await tx.user.update({where:{id:userId},data:{...changes,profile:{update:profile}}});
  },{isolationLevel:'ReadCommitted'});
  return getPlayer(userId);
}
export async function updateSettings(userId,body){const data={};for(const key of ['sound','music','reducedMotion','highContrast','allowSpectators','notifications','allowFriendRequests','showOnline'])if(key in body){fail(typeof body[key]==='boolean','VALIDATION',`${key} must be true or false.`);data[key]=body[key];}if('profileVisibility'in body){fail(['public','friends','private'].includes(body.profileVisibility),'VALIDATION','Choose public, friends or private profile visibility.');data.profileVisibility=body.profileVisibility;}await db.playerSettings.update({where:{userId},data});return getPlayer(userId);}
export async function updateLoadout(userId,powers){fail(Array.isArray(powers)&&powers.length===3&&new Set(powers).size===3&&powers.every(p=>typeof p==='string'),'VALIDATION','Equip exactly three different powers.');const owned=await db.playerPower.findMany({where:{userId,powerId:{in:powers},power:{enabled:true}}});fail(owned.length===3,'LOCKED_POWER','One of those powers is locked or not yet released.');await db.$transaction(async tx=>{const loadout=await tx.powerLoadout.findUnique({where:{userId}});await tx.powerLoadoutSlot.deleteMany({where:{loadoutId:loadout.id}});await tx.powerLoadoutSlot.createMany({data:powers.map((powerId,position)=>({loadoutId:loadout.id,powerId,position}))});});return getPlayer(userId);}
export async function walletCredit(tx,userId,amount,reason,reference){fail(Number.isInteger(amount)&&amount>=0,'ECONOMY','Invalid reward amount.');const wallet=await tx.currencyWallet.update({where:{userId},data:{coins:{increment:amount}}});await tx.currencyTransaction.create({data:{userId,amount,balanceAfter:wallet.coins,reason,reference}});return wallet;}
export async function purchaseCosmetic(userId,cosmeticId,requestId){fail(cleanText(cosmeticId,1,80)&&cleanText(requestId,8,80),'VALIDATION','A cosmetic ID and unique request ID are required.');return db.$transaction(async tx=>{
  const [locked]=await tx.$queryRaw`SELECT coins FROM CurrencyWallet WHERE userId=${userId} FOR UPDATE`;
  const previous=await tx.shopPurchase.findUnique({where:{userId_requestId:{userId,requestId}}});if(previous){fail(previous.cosmeticId===cosmeticId,'REQUEST_CONFLICT','This request ID was used for a different item.');return {purchase:previous,wallet:await tx.currencyWallet.findUnique({where:{userId}}),duplicate:true};}
  const cosmetic=await tx.cosmeticItem.findUnique({where:{id:cosmeticId}});fail(cosmetic?.enabled,'NOT_FOUND','This cosmetic is unavailable.',404);
  fail(!premiumTiers.some(tier=>tier.cosmeticId===cosmeticId),'SEASON_EXCLUSIVE','This cosmetic is an exclusive season-pass reward. Claim its premium journey tier.');
  fail(!await tx.playerInventory.findUnique({where:{userId_cosmeticId:{userId,cosmeticId}}}),'ALREADY_OWNED','You already own this cosmetic.');
  const changed=await tx.currencyWallet.updateMany({where:{userId,coins:{gte:cosmetic.price}},data:{coins:{decrement:cosmetic.price}}});fail(changed.count===1,'INSUFFICIENT_COINS','You need more coins for this cosmetic.');
  // The wallet row is locked above, so its balance is known without reading it again, and
  // createMany skips the read-back that create adds: each statement is a database round trip.
  const now=new Date(),wallet={userId,coins:Number(locked.coins)-cosmetic.price,updatedAt:now};
  const purchase={id:randomUUID(),userId,cosmeticId,requestId,coins:cosmetic.price,createdAt:now};
  await tx.shopPurchase.createMany({data:[purchase]});
  await tx.playerInventory.createMany({data:[{userId,cosmeticId}]});
  await tx.currencyTransaction.createMany({data:[{userId,amount:-cosmetic.price,balanceAfter:wallet.coins,reason:'cosmetic_purchase',reference:`purchase:${purchase.id}`}]});return {purchase,wallet};
},{isolationLevel:'ReadCommitted'});}
export async function claimDaily(userId){const key=dateKey();return db.$transaction(async tx=>{const past=await tx.rewardClaim.count({where:{userId,kind:'daily'}});const rewards=[40,50,60,70,80,90,120];const coins=rewards[past%7];await tx.rewardClaim.create({data:{userId,kind:'daily',key,coins}});const wallet=await walletCredit(tx,userId,coins,'daily_login',`daily:${userId}:${key}`);return {coins,day:past%7+1,wallet};});}
export function periodKey(period='daily',now=new Date()){const date=new Date(now);if(period==='weekly')date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10);}
export function dailyResetAt(now=new Date()){return new Date(new Date(periodKey('daily',now)).getTime()+86400000).toISOString();}
export function weeklyResetAt(now=new Date()){return new Date(new Date(periodKey('weekly',now)).getTime()+7*86400000).toISOString();}
export async function missions(userId){const today=periodKey(),week=periodKey('weekly');const [definitions,progress,totalClaims,todayClaim]=await Promise.all([db.dailyMission.findMany({where:{active:true},orderBy:{id:'asc'}}),db.playerMissionProgress.findMany({where:{userId,dateKey:{in:[today,week]}}}),db.rewardClaim.count({where:{userId,kind:'daily'}}),db.rewardClaim.findUnique({where:{userId_kind_key:{userId,kind:'daily',key:today}}})]);const values=definitions.map(m=>{const key=m.period==='weekly'?week:today;const row=progress.find(p=>p.missionId===m.id&&p.dateKey===key);return {...m,dateKey:key,progress:row?.progress||0,claimed:Boolean(row?.claimedAt)};});return {missions:values.filter(m=>m.period!=='weekly'),weeklyMissions:values.filter(m=>m.period==='weekly'),daily:{claimedToday:Boolean(todayClaim),day:totalClaims%7+1,todayDay:todayClaim?(totalClaims-1)%7+1:totalClaims%7+1,totalClaims,rewards:[40,50,60,70,80,90,120]},dateKey:today,dailyResetAt:dailyResetAt(),weeklyResetAt:weeklyResetAt()};}
export async function claimMission(userId,missionId){fail(cleanText(missionId,1,40),'VALIDATION','Choose a valid mission.');return db.$transaction(async tx=>{const mission=await tx.dailyMission.findUnique({where:{id:missionId}});fail(mission?.active,'NOT_FOUND','This mission is not available.',404);const key=periodKey(mission.period);const where={userId_missionId_dateKey:{userId,missionId,dateKey:key}};const progress=await tx.playerMissionProgress.findUnique({where});fail(progress&&progress.progress>=mission.target,'NOT_COMPLETE','Complete this mission first.');const changed=await tx.playerMissionProgress.updateMany({where:{userId,missionId,dateKey:key,claimedAt:null},data:{claimedAt:new Date()}});fail(changed.count===1,'ALREADY_CLAIMED','This reward has already been claimed.');await tx.rewardClaim.create({data:{userId,kind:'mission',key:key+':'+missionId,coins:mission.coins}});const wallet=await walletCredit(tx,userId,mission.coins,mission.period==='weekly'?'weekly_mission':'daily_mission','mission:'+userId+':'+key+':'+missionId);return {coins:mission.coins,wallet};});}
export const journeyTiers=[{level:1,requiredXp:100,coins:40},{level:2,requiredXp:500,coins:100},{level:3,requiredXp:1000,coins:150},{level:4,requiredXp:2000,coins:200},{level:5,requiredXp:3500,coins:300}];
export async function seasonJourney(userId){
 const [profile,season,claims,cosmetics]=await Promise.all([
  db.playerProfile.findUnique({where:{userId}}),
  db.season.findFirst({where:{active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}},orderBy:{startsAt:'desc'}}),
  db.rewardClaim.findMany({where:{userId,kind:{in:['season','premium_season','premium_pass']}}}),
  db.cosmeticItem.findMany({where:{id:{in:premiumTiers.map(tier=>tier.cosmeticId)}}}),
 ]);
 const participation=season?await db.seasonParticipation.findUnique({where:{seasonId_userId:{seasonId:season.id,userId}}}):null;
 const xp=participation?.xp||0,premiumOwned=Boolean(season&&claims.some(claim=>claim.kind==='premium_pass'&&claim.key===season.id));
 const claimed=(kind,level)=>Boolean(season&&claims.some(claim=>claim.kind===kind&&claim.key===`${season.id}:${level}`));
 return {season,xp,accountXp:profile?.xp||0,level:profile?.level||1,paidPassAvailable:checkoutConfigured(),xpSource:'season',premiumOwned,passCoinPrice,
  tiers:journeyTiers.map(tier=>({...tier,claimed:claimed('season',tier.level),unlocked:xp>=tier.requiredXp})),
  premiumTiers:premiumTiers.map(tier=>({...tier,cosmetic:cosmetics.find(item=>item.id===tier.cosmeticId)||null,claimed:claimed('premium_season',tier.level),unlocked:premiumOwned&&xp>=tier.requiredXp})),
  message:'The free journey rewards seasonal XP with cosmetic coins. Unlock the premium journey using earned coins or configured checkout for five exclusive cosmetics. All 22 powers remain equally available.',
 };
}
export async function claimJourney(userId,level,track='free'){
 fail(['free','premium'].includes(track),'VALIDATION','Choose the free or premium reward track.');
 const tier=(track==='premium'?premiumTiers:journeyTiers).find(item=>item.level===level);
 fail(Number.isInteger(level)&&tier,'VALIDATION','Choose a valid journey tier.');
 return db.$transaction(async tx=>{
  const season=await tx.season.findFirst({where:{active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}},orderBy:{startsAt:'desc'}});
  fail(season,'NO_ACTIVE_SEASON','There is no active season journey.',409);
  if(track==='premium')fail(await tx.rewardClaim.findUnique({where:{userId_kind_key:{userId,kind:'premium_pass',key:season.id}}}),'PASS_REQUIRED','Unlock this season cosmetic pass before claiming premium rewards.',403);
  const participation=await tx.seasonParticipation.findUnique({where:{seasonId_userId:{seasonId:season.id,userId}}});
  fail((participation?.xp||0)>=tier.requiredXp,'NOT_COMPLETE','Earn the required XP during this season before claiming this tier.');
  const key=`${season.id}:${level}`,kind=track==='premium'?'premium_season':'season';
  await tx.rewardClaim.create({data:{userId,kind,key,coins:tier.coins}});
  if(track==='premium'){
   const cosmetic=await tx.cosmeticItem.findUnique({where:{id:tier.cosmeticId}});
   fail(cosmetic,'REWARD_UNAVAILABLE','This season cosmetic reward is unavailable. Please try again later.',503);
   await tx.playerInventory.upsert({where:{userId_cosmeticId:{userId,cosmeticId:tier.cosmeticId}},create:{userId,cosmeticId:tier.cosmeticId},update:{}});
  }
  const wallet=await walletCredit(tx,userId,tier.coins,track==='premium'?'premium_season_journey':'season_journey',`${track==='premium'?'premium_season':'season'}:${userId}:${key}`);
  return {coins:tier.coins,level,wallet,track,...(track==='premium'?{cosmeticId:tier.cosmeticId}:{})};
 });
}
export async function leaderboard({region,season,limit=50}={}){limit=Math.min(100,Math.max(1,Number(limit)||50));if(season){const rows=await db.seasonParticipation.findMany({where:{seasonId:season,user:{suspended:false,...(region&&region!=='GLOBAL'?{profile:{region}}:{})}},orderBy:[{cups:'desc'},{wins:'desc'},{userId:'asc'}],take:limit,include:{user:{select:{id:true,name:true,profile:true}}}});return rows.map((r,i)=>({rank:i+1,id:r.userId,name:r.user.name,cups:r.cups,wins:r.wins,profile:r.user.profile}));}const rows=await db.playerRating.findMany({where:{user:{suspended:false,...(region&&region!=='GLOBAL'?{profile:{region}}:{})}},orderBy:[{cups:'desc'},{rankedWins:'desc'},{userId:'asc'}],take:limit,include:{user:{select:{id:true,name:true,profile:true}}}});return rows.map((r,i)=>({rank:i+1,id:r.userId,name:r.user.name,cups:r.cups,wins:r.rankedWins,profile:r.user.profile}));}
export async function matchHistory(userId,cursor){const rows=await db.match.findMany({where:{participants:{some:{userId}},status:'finished'},orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,...(cursor?{cursor:{id:cursor},skip:1}:{}),include:{participants:true,result:true}});return {matches:rows.slice(0,20).map(({state,...m})=>({...m,winnerId:m.result?.winnerId||null,endedAt:m.finishedAt,turnCount:m.result?.turns||0,outcome:m.participants.find(p=>p.userId===userId)?.outcome})),nextCursor:rows.length>20?rows[19].id:null};}
