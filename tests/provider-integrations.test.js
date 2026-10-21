import 'dotenv/config';
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac, generateKeyPairSync, sign, randomUUID} from 'node:crypto';
import {db} from '../src/server/db.mjs';
import {validHmac, validateCapturedPayment, commerceProducts, checkoutConfigured, passCoinPrice, premiumTiers} from '../src/server/commerce-policy.mjs';
import {createCheckout, fulfillCapturedPayment, verifyCheckout, orderStatus, razorpayWebhook, buyPassWithCoins, activeSeason, listCommerceProducts} from '../src/server/commerce.mjs';
import {verifyAdmobCallback, googleAdmobKeys, admobConfigured, startAdReward, grantVerifiedAdReward, adRewardStatus, admobCallback} from '../src/server/admob.mjs';
import {emailConfigured, sendEmail} from '../src/server/email.mjs';
import {claimJourney, purchaseCosmetic, equipCosmetic, updateProfile} from '../src/server/players.mjs';
import {COLLECTION_BUNDLES, COLLECTION_COSMETICS, cosmeticEmotes} from '../src/lib/cosmetic-collection.js';
import {validateMatchEmote} from '../src/server/arena.mjs';
import {hashToken} from '../src/server/security.mjs';
import {handleAPI} from '../src/server/api.mjs';

const configured=Boolean(process.env.DATABASE_URL && /^\/ea_(ci|test)_/.test(new URL(process.env.DATABASE_URL).pathname));
const run=randomUUID().replaceAll('-','').slice(0,12), users=[], matchIds=[], eventIds=[];
const env={RAZORPAY_KEY_ID:'rzp_test_provider_fixture',RAZORPAY_KEY_SECRET:'isolated-api-signing-secret',RAZORPAY_WEBHOOK_SECRET:'isolated-webhook-signing-secret'};
const adEnv={ADMOB_REWARDED_AD_UNIT_ID:'ca-app-pub-3940256099942544/5224354917'};
const hmac=(payload,key)=>createHmac('sha256',key).update(payload).digest('hex');
const code=expected=>error=>error.code===expected;
const jsonResponse=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
const keyId='90354532',pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pem=pair.publicKey.export({type:'spki',format:'pem'}),keys=new Map([[keyId,pem]]);
const signed=(content,key=pair.privateKey,id=keyId)=>`https://game.example.test/api/ads/admob/ssv?${content}&signature=${sign('sha256',Buffer.from(content),key).toString('base64url')}&key_id=${id}`;
const callback=(fields={})=>signed(new URLSearchParams({ad_network:'5450213213286189855',ad_unit:'5224354917',custom_data:'opaque+data/with space',reward_amount:'25',reward_item:'coins',timestamp:String(Date.now()),transaction_id:'transaction_fixture_123',user_id:'player_fixture',...fields}).toString());
const keyFetcher=async url=>{assert.equal(String(url),'https://www.gstatic.com/admob/reward/verifier-keys.json');return jsonResponse({keys:[{keyId:Number(keyId),pem}]});};

after(async()=>{
  if(!configured)return;
  if(matchIds.length)await db.match.deleteMany({where:{id:{in:matchIds}}});
  if(users.length){await db.auditLog.deleteMany({where:{userId:{in:users}}});await db.user.deleteMany({where:{id:{in:users}}});}
  if(eventIds.length)await db.providerEvent.deleteMany({where:{id:{in:eventIds}}});
  await db.$disconnect();
});
async function fixture(coins=250,guest=false) {
  const user=await db.user.create({data:{name:'Provider '+run+' '+users.length,email:`${run}-${users.length}@example.test`,guest,wallet:{create:{coins}},profile:{create:{}},settings:{create:{}},stats:{create:{}},rating:{create:{}}}});
  users.push(user.id);return user;
}
const captured=(order,id='pay_'+run)=>({id,status:'captured',order_id:order.providerOrderId,amount:order.amount,currency:order.currency,amount_refunded:0});
async function pending(user,sku='coins-spark',requestId='checkout-'+randomUUID()) {
  let posts=0;
  const fetcher=async(url,options)=>{
    assert.equal(url,'https://api.razorpay.com/v1/orders');assert.equal(options.method,'POST');assert(options.signal instanceof AbortSignal);
    assert.equal(options.headers.authorization,'Basic '+Buffer.from(env.RAZORPAY_KEY_ID+':'+env.RAZORPAY_KEY_SECRET).toString('base64'));
    const body=JSON.parse(options.body);assert(body.receipt.length<=40);assert.equal(body.notes.game_user,user.id);posts+=1;
    return jsonResponse({id:'order_'+randomUUID().replaceAll('-',''),amount:body.amount,currency:body.currency});
  };
  const details=await createCheckout(user.id,{sku,requestId},{env,fetcher});
  const order=await db.commerceOrder.findUnique({where:{id:details.orderId}});
  return {order,details,fetcher,get posts(){return posts;}};
}
async function webhook(order,payment,type='payment.refunded',id='fixture-'+run+'-'+randomUUID()) {
  const raw=JSON.stringify({event:type,payload:{payment:{entity:{id:payment.id,order_id:order.providerOrderId}}}});
  eventIds.push('razorpay:'+id);
  return razorpayWebhook(raw,hmac(raw,env.RAZORPAY_WEBHOOK_SECRET),id,{env,fetcher:async url=>{assert.equal(url,'https://api.razorpay.com/v1/payments/'+payment.id);return jsonResponse(payment);}});
}

test('Razorpay HMAC checks raw UTF8 bytes rather than a reserialized JSON object',()=>{
  const raw=Buffer.from('{\n "amount":4900, "note":"cosmic ★"\n}');
  const signature=hmac(raw,env.RAZORPAY_WEBHOOK_SECRET);
  assert(validHmac(raw,signature,env.RAZORPAY_WEBHOOK_SECRET));
  assert(!validHmac(JSON.stringify(JSON.parse(raw)),signature,env.RAZORPAY_WEBHOOK_SECRET));
  assert(!validHmac(raw,signature,'wrong-secret'));
  for(const malformed of ['',signature.slice(1),'z'.repeat(64),null])assert(!validHmac(raw,malformed,env.RAZORPAY_WEBHOOK_SECRET));
});

test('Payment prices use server-side integer paise and capture must match its recorded order',()=>{
  assert.equal(checkoutConfigured(env),true);assert.equal(checkoutConfigured({RAZORPAY_KEY_ID:'public-only'}),false);
  const products=commerceProducts({});assert.equal(products.find(p=>p.id==='coins-spark').amount,4900);assert(products.every(p=>Number.isInteger(p.amount)&&p.currency==='INR'));
  const bundles=products.filter(product=>product.kind==='bundle');assert.equal(bundles.length,COLLECTION_BUNDLES.length);assert.equal(bundles.filter(bundle=>!['ascendant','dominion'].includes(bundle.themeId)).length,10);assert(bundles.every(bundle=>bundle.amount===(bundle.themeId==='dominion'?249900:bundle.themeId==='ascendant'?49900:14900)&&bundle.coins===0&&bundle.cosmeticIds.length===9));
  assert.equal(commerceProducts({RAZORPAY_COLLECTION_PAISE:'19900'}).find(product=>product.kind==='bundle').amount,19900);
  assert.equal(commerceProducts({RAZORPAY_COLLECTION_PAISE:'19900'}).find(product=>product.id==='bundle-ascendant').amount,49900);
  assert.equal(commerceProducts({RAZORPAY_ASCENDANT_PAISE:'59900'}).find(product=>product.id==='bundle-ascendant').amount,59900);
  assert.equal(commerceProducts({RAZORPAY_ASCENDANT_PAISE:'59900'}).find(product=>product.id==='bundle-solar').amount,14900);
  assert.throws(()=>commerceProducts({RAZORPAY_ASCENDANT_PAISE:'499.5'}),code('PAYMENT_CONFIG'));
  assert.throws(()=>commerceProducts({RAZORPAY_COLLECTION_PAISE:'149.5'}),code('PAYMENT_CONFIG'));
  assert.throws(()=>commerceProducts({RAZORPAY_SPARK_PAISE:'49.5'}),code('PAYMENT_CONFIG'));
  const order={providerOrderId:'order_fixture',amount:4900,currency:'INR'},payment=captured(order,'pay_fixture');
  assert.equal(validateCapturedPayment(order,payment),payment);
  for(const alteration of [{status:'authorized'},{order_id:'order_other'},{amount:1},{currency:'USD'},{id:'../../secrets'}])assert.throws(()=>validateCapturedPayment(order,{...payment,...alteration}));
});

test('Google SSV verifies original escaped content, DER ECDSA and decodes custom data once',()=>{
  const url=callback();const result=verifyAdmobCallback(url,keys);
  assert.equal(result.custom_data,'opaque+data/with space');assert.equal(result.ad_unit,'5224354917');
  assert.throws(()=>verifyAdmobCallback(url.replace('reward_amount=25','reward_amount=25000'),keys),code('AD_SIGNATURE'));
  assert.throws(()=>verifyAdmobCallback(url.replace('%2B','%2b'),keys),code('AD_SIGNATURE'));
  assert.throws(()=>verifyAdmobCallback(url,new Map()),code('AD_SIGNATURE'));
});

test('SSV rejects signed duplicate keys, unsigned trailing fields, malformed signatures and expired timestamps',()=>{
  const base=new URL(callback()).search.slice(1).split('&signature=')[0];
  assert.throws(()=>verifyAdmobCallback(signed(base+'&user_id=another'),keys),code('AD_SIGNATURE'));
  assert.throws(()=>verifyAdmobCallback(callback()+'&reward_amount=999',keys),code('AD_SIGNATURE'));
  assert.throws(()=>verifyAdmobCallback(callback().replace(/signature=[^&]+/,'signature=AAAA'),keys),code('AD_SIGNATURE'));
  assert.throws(()=>verifyAdmobCallback(callback({timestamp:String(Date.now()-86400001)}),keys),code('AD_EXPIRED'));
  assert.throws(()=>verifyAdmobCallback(callback({transaction_id:'bad'}),keys),code('AD_CALLBACK'));
  assert.equal(verifyAdmobCallback(callback({timestamp:String(Date.now()*1000)}),keys).reward_item,'coins');
});

test('Google verifier keys use the fixed upstream URL and bounded caching with explicit rotation refresh',async()=>{
  let calls=0;const now=Date.now(),fetcher=async url=>{calls++;return keyFetcher(url);};
  const first=await googleAdmobKeys({fetcher,now,force:true});assert(first.has(keyId));
  assert.equal(await googleAdmobKeys({fetcher,now:now+1000}),first);assert.equal(calls,1);
  await googleAdmobKeys({fetcher,now:now+3600001});assert.equal(calls,2);
  await googleAdmobKeys({fetcher,now:now+3600002,force:true});assert.equal(calls,2,'Unknown-key refreshes must be throttled');
  await googleAdmobKeys({fetcher,now:now+3660002,force:true});assert.equal(calls,3);
  await assert.rejects(googleAdmobKeys({now:now+3720003,force:true,fetcher:async()=>jsonResponse({keys:[]})}),code('AD_VERIFICATION_UNAVAILABLE'));
  await assert.rejects(googleAdmobKeys({now:now+3780004,force:true,fetcher:async()=>new Response('',{status:503})}),code('AD_VERIFICATION_UNAVAILABLE'));
  assert.equal(admobConfigured(adEnv),true);assert.equal(admobConfigured({}),false);
});

test('Resend uses its real provider request contract and returns a generic delivery failure',async()=>{
  const emailEnv={EMAIL_FROM:'Arena <arena@example.test>',RESEND_API_KEY:'isolated-resend-key'};let calls=0;
  await sendEmail('player@example.test','Verify your account','A private one-time link',{env:emailEnv,fetcher:async(url,options)=>{
    calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers.authorization,'Bearer isolated-resend-key');
    assert.deepEqual(JSON.parse(options.body),{from:emailEnv.EMAIL_FROM,to:['player@example.test'],subject:'Verify your account',text:'A private one-time link'});return jsonResponse({id:'email_fixture'});
  }});assert.equal(calls,1);
  await assert.rejects(sendEmail('player@example.test','Subject','Body',{env:emailEnv,fetcher:async()=>new Response('',{status:429})}),code('EMAIL_DELIVERY'));
  assert.equal(emailConfigured({EMAIL_FROM:'arena@example.test'}),false);
});

test('SMTP requires STARTTLS on587, implicit TLS on465 and always releases its transport',async()=>{
  for(const port of [587,465]) {
    let closed=false;
    await sendEmail('player@example.test','Subject','Body',{env:{EMAIL_FROM:'arena@example.test',SMTP_HOST:'smtp.example.test',SMTP_USER:'user',SMTP_PASSWORD:'secret',SMTP_PORT:String(port)},transportFactory:options=>{
      assert.equal(options.secure,port===465);assert.equal(options.requireTLS,port!==465);assert.equal(options.tls.minVersion,'TLSv1.2');assert.equal(options.disableFileAccess,true);assert.equal(options.disableUrlAccess,true);
      return {sendMail:async message=>assert.equal(message.to,'player@example.test'),close:()=>{closed=true;}};
    }});assert.equal(closed,true);
  }
  let closed=false;
  await assert.rejects(sendEmail('player@example.test','Subject','Body',{env:{EMAIL_FROM:'arena@example.test',SMTP_HOST:'smtp.example.test',SMTP_USER:'user',SMTP_PASSWORD:'secret'},transportFactory:()=>({sendMail:async()=>{throw new Error('provider private data');},close:()=>{closed=true;}})}),error=>error.code==='EMAIL_DELIVERY'&&!error.message.includes('private data'));
  assert.equal(closed,true);
});

test('A configured HTTPS email webhook wins over incomplete SMTP settings and production rejects HTTP',async()=>{
  const emailEnv={NODE_ENV:'production',EMAIL_FROM:'arena@example.test',EMAIL_WEBHOOK_URL:'https://mailer.example.test/send',EMAIL_WEBHOOK_TOKEN:'fixture-token',SMTP_HOST:'incomplete.example.test'};let delivered=false;
  await sendEmail('player@example.test','Subject','Body',{env:emailEnv,transportFactory:()=>assert.fail('Incomplete SMTP must not be selected'),fetcher:async(url,options)=>{
    delivered=true;assert.equal(String(url),emailEnv.EMAIL_WEBHOOK_URL);assert.equal(options.headers.authorization,'Bearer fixture-token');assert.equal(JSON.parse(options.body).to,'player@example.test');return jsonResponse({ok:true});
  }});assert.equal(delivered,true);
  await assert.rejects(sendEmail('player@example.test','Subject','Body',{env:{...emailEnv,EMAIL_WEBHOOK_URL:'http://mailer.example.test/send'}}),code('EMAIL_CONFIG'));
});

test('real isolated MySQL provider settlement and cosmetic entitlements',{skip:!configured,timeout:60000},async t=>{
  // Canonical display catalog only, scoped to the guarded disposable test DB.
  for(const item of COLLECTION_COSMETICS)await db.cosmeticItem.upsert({where:{id:item.id},create:item,update:{enabled:true}});
  const bundle=COLLECTION_BUNDLES[0];

  await t.test('Ascendant coin styles use the same ownership checks, debit once and equip all nine profile slots',async()=>{
    const styles=COLLECTION_COSMETICS.filter(item=>item.rarity==='ascendant'),user=await fixture(25000),other=await fixture();
    const fields={avatar:'avatar',board:'equippedBoard',marks:'equippedMark',arena:'equippedArena',frame:'equippedFrame',banner:'equippedBanner',effect:'equippedEffect',emote:'equippedEmote',title:'title'};
    let balance=25000;
    for(const item of styles){
      await assert.rejects(equipCosmetic(other.id,item.id),code('NOT_OWNED'));
      const requestId='ascendant-'+randomUUID(),first=await purchaseCosmetic(user.id,item.id,requestId),again=await purchaseCosmetic(user.id,item.id,requestId);
      balance-=item.price;assert.equal(first.wallet.coins,balance);assert.equal(again.wallet.coins,balance);assert.equal(again.duplicate,true);
      await assert.rejects(purchaseCosmetic(user.id,item.id,'owned-'+randomUUID()),code('ALREADY_OWNED'));
      const equipped=await equipCosmetic(user.id,item.id);assert.equal(equipped.profile[fields[item.type]],item.type==='title'?item.name:item.id);
    }
    assert.equal(await db.playerInventory.count({where:{userId:user.id}}),9);
    assert.equal(await db.shopPurchase.count({where:{userId:user.id}}),9);
    assert.equal(await db.playerPower.count({where:{userId:user.id}}),0);
    assert.equal((await db.playerRating.findUnique({where:{userId:user.id}})).cups,0);
  });

  await t.test('Ascendant cash collection snapshots its premium price and duplicate capture grants cosmetics without coins or powers',async()=>{
    const user=await fixture(),premium=COLLECTION_BUNDLES.find(item=>item.id==='bundle-ascendant');
    const listed=(await listCommerceProducts(user.id,env)).products.find(product=>product.id===premium.id);
    assert.equal(listed.amount,49900);assert.equal(listed.itemCount,9);
    const {order}=await pending(user,premium.id);assert.equal(order.amount,49900);assert.deepEqual(order.cosmeticIds,premium.cosmeticIds);
    const payment=captured(order,'pay_'+run+'Ascendant');
    await assert.rejects(fulfillCapturedPayment(order,{...payment,amount:14900}),code('PAYMENT_MISMATCH'));
    const results=await Promise.all([fulfillCapturedPayment(order,payment),fulfillCapturedPayment(order,payment)]);
    assert.equal(results.filter(result=>result.duplicate).length,1);
    assert.equal(await db.playerInventory.count({where:{userId:user.id}}),9);
    assert.equal(await db.commerceCosmeticGrant.count({where:{orderId:order.id}}),9);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
    assert.equal(await db.playerPower.count({where:{userId:user.id}}),0);
    await assert.rejects(pending(user,premium.id),code('ALREADY_OWNED'));
    for(const id of premium.cosmeticIds)await equipCosmetic(user.id,id);
  });

  await t.test('Dominion stays cash-only despite edited catalog prices and verified capture/refund controls all nine slots',async()=>{
    const user=await fixture(100000),premium=COLLECTION_BUNDLES.find(item=>item.id==='bundle-dominion');
    const before=(await db.currencyWallet.findUnique({where:{userId:user.id}})).coins;
    const listed=(await listCommerceProducts(user.id,env)).products.find(product=>product.id===premium.id);
    assert.equal(listed.amount,249900);assert.equal(listed.purchaseMode,'real-money');assert.equal(listed.itemCount,9);
    const response=await handleAPI(new Request('http://localhost/api/catalog'));
    const catalog=await response.json();
    for(const id of premium.cosmeticIds){
      assert.equal(catalog.cosmetics.find(item=>item.id===id).purchaseMode,'real-money');
      await db.cosmeticItem.update({where:{id},data:{price:1}});
      try{
        for(const alias of [id,id.toUpperCase(),id+' '])await assert.rejects(purchaseCosmetic(user.id,alias,'dominion-coin-'+randomUUID()),code('REAL_MONEY_ONLY'));
      }
      finally{await db.cosmeticItem.update({where:{id},data:{price:0}});}
    }
    await assert.rejects(purchaseCosmetic(user.id,'ávatar-collection-dominion','dominion-alias-'+randomUUID()),code('REAL_MONEY_ONLY'));
    assert.equal(await db.playerInventory.count({where:{userId:user.id}}),0);
    assert.equal(await db.shopPurchase.count({where:{userId:user.id}}),0);
    const {order}=await pending(user,premium.id),payment=captured(order,'pay_'+run+'Dominion');
    assert.equal(order.amount,249900);assert.deepEqual(order.cosmeticIds,premium.cosmeticIds);
    await assert.rejects(fulfillCapturedPayment(order,{...payment,amount:1}),code('PAYMENT_MISMATCH'));
    await assert.rejects(fulfillCapturedPayment(order,{...payment,status:'authorized'}),code('PAYMENT_PENDING'));
    const results=await Promise.all([fulfillCapturedPayment(order,payment),fulfillCapturedPayment(order,payment)]);
    assert.equal(results.filter(result=>result.duplicate).length,1);
    assert.equal(await db.playerInventory.count({where:{userId:user.id,cashCreated:true}}),9);
    assert.equal(await db.commerceCosmeticGrant.count({where:{orderId:order.id}}),9);
    for(const id of premium.cosmeticIds)await equipCosmetic(user.id,id);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,before);
    assert.equal(await db.playerPower.count({where:{userId:user.id}}),0);
    assert.equal((await db.playerRating.findUnique({where:{userId:user.id}})).cups,0);
    await assert.rejects(pending(user,premium.id),code('ALREADY_OWNED'));
    const refunded={...payment,status:'refunded',amount_refunded:order.amount};
    await webhook(order,refunded);await webhook(order,refunded);
    assert.equal(await db.playerInventory.count({where:{userId:user.id}}),0);
    const profile=await db.playerProfile.findUnique({where:{userId:user.id}});
    assert.equal(profile.avatar,'avatar-void');assert.equal(profile.equippedBoard,'board-void');assert.equal(profile.equippedMark,'marks-neon');assert.equal(profile.title,'Rookie Strategist');
    for(const field of ['equippedFrame','equippedBanner','equippedArena','equippedEffect','equippedEmote'])assert.equal(profile[field],null);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,before);
  });

  await t.test('Collections require enabled catalog styles, a registered player and configured checkout',async()=>{
    const user=await fixture(),guest=await fixture(250,true);
    await assert.rejects(createCheckout(user.id,{sku:bundle.id,requestId:'disabled-'+randomUUID()},{env:{}}),code('CHECKOUT_UNAVAILABLE'));
    await assert.rejects(createCheckout(guest.id,{sku:bundle.id,requestId:'guest-'+randomUUID()},{env}),code('REGISTER_REQUIRED'));
    const id=bundle.cosmeticIds[0];await db.cosmeticItem.update({where:{id},data:{enabled:false}});
    try {
      assert(!(await listCommerceProducts(user.id,env)).products.some(product=>product.id===bundle.id));
      await assert.rejects(createCheckout(user.id,{sku:bundle.id,requestId:'unavailable-'+randomUUID()},{env}),code('PRODUCT_UNAVAILABLE'));
    } finally {await db.cosmeticItem.update({where:{id},data:{enabled:true}});}
  });

  await t.test('A partial collection shows full price, stores its immutable snapshot and reuses a pending external order',async()=>{
    const user=await fixture(10000);await purchaseCosmetic(user.id,bundle.cosmeticIds[0],'partial-'+randomUUID());
    const listed=(await listCommerceProducts(user.id,env)).products.find(product=>product.id===bundle.id);
    assert.equal(listed.ownedCount,1);assert.equal(listed.itemCount,9);assert.equal(listed.amount,14900);
    const first=await pending(user,bundle.id),second=await pending(user,bundle.id);
    assert.equal(first.order.id,second.order.id);assert.equal(first.posts,1);assert.equal(second.posts,0);
    assert.deepEqual(first.order.cosmeticIds,bundle.cosmeticIds);assert.equal(first.order.coins,0);assert.equal(first.order.amount,14900);
    await assert.rejects(createCheckout(user.id,{sku:'coins-flare',requestId:first.order.requestId},{env}),code('REQUEST_CONFLICT'));
    const payment=captured(first.order,'pay_'+run+'BundleSigned');
    const body={orderId:first.order.id,cosmeticIds:['avatar-void'],coins:999999,razorpay_order_id:first.order.providerOrderId,razorpay_payment_id:payment.id,razorpay_signature:hmac(first.order.providerOrderId+'|'+payment.id,env.RAZORPAY_KEY_SECRET)};
    const before=(await db.currencyWallet.findUnique({where:{userId:user.id}})).coins;
    await verifyCheckout(user.id,body,{env,fetcher:async()=>jsonResponse(payment)});await webhook(first.order,payment,'payment.captured');
    assert.equal(await db.playerInventory.count({where:{userId:user.id,cosmeticId:{in:bundle.cosmeticIds}}}),9);
    assert.equal(await db.commerceCosmeticGrant.count({where:{orderId:first.order.id}}),9);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,before);
    assert.equal(await db.currencyTransaction.count({where:{userId:user.id,reason:'razorpay_cosmetic_coins'}}),0);
    assert.equal(await db.playerPower.count({where:{userId:user.id}}),0);
    await assert.rejects(pending(user,bundle.id),code('ALREADY_OWNED'));
  });

  await t.test('Duplicate capture grants exactly nine styles and honors the snapshot after catalog changes',async()=>{
    const user=await fixture(),{order}=await pending(user,bundle.id),payment=captured(order,'pay_'+run+'BundleDuplicate');
    const id=bundle.cosmeticIds[0];await db.cosmeticItem.update({where:{id},data:{enabled:false}});
    try {
      const results=await Promise.all([fulfillCapturedPayment(order,payment),fulfillCapturedPayment(order,payment)]);
      assert.equal(results.filter(result=>result.duplicate).length,1);
      assert.equal(await db.playerInventory.count({where:{userId:user.id}}),9);
      assert.equal(await db.commerceCosmeticGrant.count({where:{orderId:order.id}}),9);
      assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
      await assert.rejects(fulfillCapturedPayment(order,{...payment,id:'pay_different'}),code('PAYMENT_MISMATCH'));
    } finally {await db.cosmeticItem.update({where:{id},data:{enabled:true}});}
  });

  await t.test('Collection refunds preserve coin and legacy ownership and reset only actually revoked equipped styles',async()=>{
    const user=await fixture(10000),other=await fixture();
    await purchaseCosmetic(user.id,bundle.cosmeticIds[0],'refund-owned-'+randomUUID());
    await db.playerInventory.create({data:{userId:user.id,cosmeticId:bundle.cosmeticIds[1]}});
    await db.playerInventory.create({data:{userId:other.id,cosmeticId:bundle.cosmeticIds[2]}});
    const {order}=await pending(user,bundle.id),payment=captured(order,'pay_'+run+'BundleRefund');await fulfillCapturedPayment(order,payment);
    for(const id of bundle.cosmeticIds)await equipCosmetic(user.id,id);
    const before=(await db.currencyWallet.findUnique({where:{userId:user.id}})).coins;
    await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});
    assert.deepEqual((await db.playerInventory.findMany({where:{userId:user.id},orderBy:{cosmeticId:'asc'}})).map(item=>item.cosmeticId),bundle.cosmeticIds.slice(0,2).sort());
    const profile=await db.playerProfile.findUnique({where:{userId:user.id}});
    assert.equal(profile.avatar,bundle.cosmeticIds[0]);assert.equal(profile.equippedBoard,bundle.cosmeticIds[1]);assert.equal(profile.equippedMark,'marks-neon');assert.equal(profile.title,'Rookie Strategist');
    for(const field of ['equippedArena','equippedFrame','equippedBanner','equippedEffect','equippedEmote'])assert.equal(profile[field],null);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,before);
    assert.equal(await db.playerInventory.count({where:{userId:other.id}}),1);
    const audit=await db.auditLog.findFirst({where:{userId:user.id,action:'cosmetic_payment_refunded'}});
    assert.equal(audit.details.revokedCosmeticIds.length,7);assert.equal(audit.details.retainedCosmeticIds.length,2);
    assert.equal(await db.auditLog.count({where:{userId:user.id,action:'cosmetic_payment_refunded'}}),1);
    await fulfillCapturedPayment(order,payment);assert.equal(await db.playerInventory.count({where:{userId:user.id}}),2);
  });

  await t.test('Overlapping paid order entitlements survive one refund and disappear only after both are refunded',async()=>{
    const user=await fixture(10000),first=await pending(user,bundle.id);
    // A provider order may remain payable after an upstream preparation failure.
    await db.commerceOrder.update({where:{id:first.order.id},data:{status:'failed'}});
    const second=await pending(user,bundle.id),a=captured(first.order,'pay_'+run+'BundleOverlapA'),b=captured(second.order,'pay_'+run+'BundleOverlapB');
    await Promise.all([fulfillCapturedPayment(first.order,a),fulfillCapturedPayment(second.order,b)]);
    assert.equal(await db.playerInventory.count({where:{userId:user.id}}),9);
    await purchaseCosmetic(user.id,'frame-astral','outside-collection-'+randomUUID());await equipCosmetic(user.id,'frame-astral');
    await webhook(first.order,{...a,status:'refunded',amount_refunded:first.order.amount});assert.equal(await db.playerInventory.count({where:{userId:user.id}}),10);
    await webhook(second.order,{...b,status:'refunded',amount_refunded:second.order.amount});assert.equal(await db.playerInventory.count({where:{userId:user.id}}),1);
    assert.equal((await db.playerProfile.findUnique({where:{userId:user.id}})).equippedFrame,'frame-astral');
  });

  await t.test('A partial money refund retains styles; a full refund before fulfillment grants nothing',async()=>{
    const user=await fixture(),{order}=await pending(user,bundle.id),payment=captured(order,'pay_'+run+'BundleEarly');
    await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});await fulfillCapturedPayment(order,payment);
    assert.equal(await db.playerInventory.count({where:{userId:user.id}}),0);assert.equal(await db.commerceCosmeticGrant.count({where:{orderId:order.id}}),0);
    assert.equal((await db.commerceOrder.findUnique({where:{id:order.id}})).status,'refunded');
    const other=await fixture(),next=await pending(other,bundle.id),paid=captured(next.order,'pay_'+run+'BundlePartialRefund');await fulfillCapturedPayment(next.order,paid);
    await webhook(next.order,{...paid,status:'refunded',amount_refunded:100});
    assert.equal((await db.commerceOrder.findUnique({where:{id:next.order.id}})).status,'paid');assert.equal(await db.playerInventory.count({where:{userId:other.id}}),9);
  });

  await t.test('Cash collection capture contends with earned coin purchase without duplicate inventory or fake credit',async()=>{
    for(let index=0;index<4;index++) {
      const user=await fixture(10000),{order}=await pending(user,bundle.id),payment=captured(order,'pay_'+run+'BundleCoinRace'+index);
      const results=await Promise.allSettled([fulfillCapturedPayment(order,payment),purchaseCosmetic(user.id,bundle.cosmeticIds[0],'bundle-coin-race-'+randomUUID())]);
      assert.equal(results[0].status,'fulfilled');
      const purchase=await db.shopPurchase.findFirst({where:{userId:user.id,cosmeticId:bundle.cosmeticIds[0]}}),wallet=await db.currencyWallet.findUnique({where:{userId:user.id}});
      assert.equal(wallet.coins,10000-(purchase?.coins||0));assert.equal(await db.playerInventory.count({where:{userId:user.id}}),9);
      await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});
      assert.equal(await db.playerInventory.count({where:{userId:user.id}}),purchase?1:0);
      assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,wallet.coins);
    }
  });

  await t.test('Capture/refund and equip/refund races cannot leave revoked styles equipped',async()=>{
    for(let index=0;index<4;index++) {
      const user=await fixture(),{order}=await pending(user,bundle.id),payment=captured(order,'pay_'+run+'BundleRefundRace'+index);
      const results=await Promise.allSettled([fulfillCapturedPayment(order,payment),webhook(order,{...payment,status:'refunded',amount_refunded:order.amount})]);
      assert(results.every(result=>result.status==='fulfilled'),JSON.stringify(results));
      assert.equal((await db.commerceOrder.findUnique({where:{id:order.id}})).status,'refunded');assert.equal(await db.playerInventory.count({where:{userId:user.id}}),0);
      const next=await pending(user,bundle.id),paid=captured(next.order,'pay_'+run+'BundleEquipRace'+index);await fulfillCapturedPayment(next.order,paid);
      await Promise.allSettled([index%2?updateProfile(user.id,{equippedFrame:bundle.cosmeticIds[4]}):equipCosmetic(user.id,bundle.cosmeticIds[4]),webhook(next.order,{...paid,status:'refunded',amount_refunded:next.order.amount})]);
      assert.equal((await db.playerProfile.findUnique({where:{userId:user.id}})).equippedFrame,null);
      assert.equal(await db.playerInventory.count({where:{userId:user.id}}),0);
    }
  });

  await t.test('All collection emotes require the matching equipped inventory item while six base signals remain free',async()=>{
    const user=await fixture();for(const emote of ['wave','gg','wow','think','fire','shield'])await validateMatchEmote(user.id,emote);
    await assert.rejects(validateMatchEmote(user.id,'unknown'),code('VALIDATION'));
    for(const item of COLLECTION_COSMETICS.filter(item=>item.type==='emote')) {
      for(const emote of cosmeticEmotes(item.id))await assert.rejects(validateMatchEmote(user.id,emote),code('EMOTE_LOCKED'));
      await db.playerInventory.create({data:{userId:user.id,cosmeticId:item.id}});await equipCosmetic(user.id,item.id);
      for(const emote of cosmeticEmotes(item.id))await validateMatchEmote(user.id,emote);
      await db.playerInventory.delete({where:{userId_cosmeticId:{userId:user.id,cosmeticId:item.id}}});
      await assert.rejects(validateMatchEmote(user.id,cosmeticEmotes(item.id)[0]),code('EMOTE_LOCKED'));
      await db.playerProfile.update({where:{userId:user.id},data:{equippedEmote:null}});
    }
  });

  await t.test('Concurrent checkout retries create one external order and capture credits coins exactly once',async()=>{
    const user=await fixture();const requestId='same-request-'+randomUUID();let posts=0;
    const fetcher=async(url,options)=>{assert.equal(url,'https://api.razorpay.com/v1/orders');posts++;const body=JSON.parse(options.body);return jsonResponse({id:'order_'+run+'Retry',amount:body.amount,currency:body.currency});};
    const [first,second]=await Promise.all([createCheckout(user.id,{sku:'coins-spark',requestId},{env,fetcher}),createCheckout(user.id,{sku:'coins-spark',requestId},{env,fetcher})]);
    assert.equal(first.orderId,second.orderId);assert.equal(posts,1);assert.equal(first.amount,4900);
    await assert.rejects(createCheckout(user.id,{sku:'coins-flare',requestId},{env,fetcher}),code('REQUEST_CONFLICT'));
    const order=await db.commerceOrder.findUnique({where:{id:first.orderId}}),payment=captured(order,'pay_'+run+'Capture');
    const results=await Promise.all([fulfillCapturedPayment(order,payment),fulfillCapturedPayment(order,payment)]);
    assert.equal(results.filter(result=>result.duplicate).length,1);assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,750);
    assert.equal(await db.currencyTransaction.count({where:{reference:'razorpay:'+payment.id}}),1);
    await assert.rejects(verifyCheckout(user.id,{orderId:order.id,razorpay_order_id:order.providerOrderId,razorpay_payment_id:payment.id,razorpay_signature:'0'.repeat(64)},{env,fetcher}),code('PAYMENT_SIGNATURE'));
  });

  await t.test('A client verification cannot grant an authorized-only payment or another player’s order',async()=>{
    const user=await fixture(),other=await fixture();const {order}=await pending(user);const payment=captured(order,'pay_'+run+'Authorized');
    const body={orderId:order.id,razorpay_order_id:order.providerOrderId,razorpay_payment_id:payment.id,razorpay_signature:hmac(order.providerOrderId+'|'+payment.id,env.RAZORPAY_KEY_SECRET)};
    await assert.rejects(verifyCheckout(other.id,body,{env}),code('NOT_FOUND'));
    await assert.rejects(verifyCheckout(user.id,body,{env,fetcher:async()=>jsonResponse({...payment,status:'authorized'})}),code('PAYMENT_PENDING'));
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
    await verifyCheckout(user.id,body,{env,fetcher:async()=>jsonResponse(payment)});
    assert.equal((await orderStatus(user.id,order.id,{env})).status,'paid');
  });

  await t.test('Full refunds are idempotent, bounded at zero and audit spent coins for review',async()=>{
    const user=await fixture(100),{order}=await pending(user),payment=captured(order,'pay_'+run+'Refund');
    await fulfillCapturedPayment(order,payment);await purchaseCosmetic(user.id,'avatar-ember','refund-spend-'+randomUUID());
    const refunded={...payment,status:'refunded',amount_refunded:order.amount};
    await webhook(order,refunded);await webhook(order,refunded);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,0);
    assert.equal(await db.currencyTransaction.count({where:{reference:'refund:'+payment.id}}),1);
    const audit=await db.auditLog.findFirst({where:{userId:user.id,action:'cosmetic_payment_refunded'}});
    assert.equal(audit.details.outstandingCoins,250);assert.equal(audit.details.reviewRequired,true);
    assert.equal((await db.commerceOrder.findUnique({where:{id:order.id}})).status,'refunded');
    await fulfillCapturedPayment(order,payment);assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,0);
  });

  await t.test('Refund and cosmetic spending contend on the same wallet without negative balances',async()=>{
    for(let index=0;index<4;index++){
      const user=await fixture(),{order}=await pending(user),payment=captured(order,'pay_'+run+'Race'+index);
      await fulfillCapturedPayment(order,payment);
      await Promise.allSettled([webhook(order,{...payment,status:'refunded',amount_refunded:order.amount}),purchaseCosmetic(user.id,'avatar-ember','race-spend-'+randomUUID())]);
      const wallet=await db.currencyWallet.findUnique({where:{userId:user.id}});assert(wallet.coins>=0);
      const ledger=await db.currencyTransaction.findMany({where:{userId:user.id}});assert(ledger.every(entry=>entry.balanceAfter>=0));
      assert.equal((await db.commerceOrder.findUnique({where:{id:order.id}})).status,'refunded');
    }
  });

  await t.test('Refund provider responses must match the captured payment identity, amount and currency',async()=>{
    const user=await fixture(),{order}=await pending(user),payment=captured(order,'pay_'+run+'Mismatch');await fulfillCapturedPayment(order,payment);
    for(const alteration of [{order_id:'order_other'},{currency:'USD'},{amount:1},{id:'pay_other'}])await assert.rejects(webhook(order,{...payment,status:'refunded',amount_refunded:order.amount,...alteration}),code('PAYMENT_MISMATCH'));
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,750);
  });

  await t.test('The earned cosmetic pass charges once and premium claims require seasonal XP and ownership',async()=>{
    const user=await fixture(2000),season=await activeSeason();assert(season,'Seed an active season for provider fixtures');
    await assert.rejects(claimJourney(user.id,1,'premium'),code('PASS_REQUIRED'));
    const results=await Promise.allSettled([buyPassWithCoins(user.id),buyPassWithCoins(user.id)]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,2000-passCoinPrice);
    await assert.rejects(claimJourney(user.id,1,'premium'),code('NOT_COMPLETE'));
    await db.seasonParticipation.create({data:{userId:user.id,seasonId:season.id,xp:100}});
    await claimJourney(user.id,1,'premium');await assert.rejects(claimJourney(user.id,1,'premium'));
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,2000-passCoinPrice+premiumTiers[0].coins);
    assert.equal(await db.playerInventory.count({where:{userId:user.id,cosmeticId:premiumTiers[0].cosmeticId}}),1);
    assert.equal(await db.playerPower.count({where:{userId:user.id}}),0);
  });

  await t.test('A delayed cash pass capture returns its previously spent earned coins exactly once',async()=>{
    const user=await fixture(2000),{order}=await pending(user,'season-pass');
    await assert.rejects(buyPassWithCoins(user.id),code('PAYMENT_PENDING'));
    await db.commerceOrder.update({where:{id:order.id},data:{createdAt:new Date(Date.now()-31*60000)}});
    await buyPassWithCoins(user.id);assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,1100);
    const payment=captured(order,'pay_'+run+'Reconcile');
    await fulfillCapturedPayment(order,payment);await webhook(order,payment,'payment.captured');await webhook(order,payment,'order.paid');
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,2000);
    assert.equal(await db.currencyTransaction.count({where:{reference:'pass-reconciled:'+user.id+':'+order.seasonId}}),1);
    assert.equal(await db.rewardClaim.count({where:{userId:user.id,kind:'premium_pass',key:order.seasonId}}),1);
    await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,2000);
    assert.equal(await db.rewardClaim.count({where:{userId:user.id,kind:'premium_pass',key:order.seasonId}}),0);
  });

  await t.test('A full refund delivered before capture permanently closes the order without any reward',async()=>{
    const user=await fixture(),{order}=await pending(user),payment=captured(order,'pay_'+run+'EarlyRefund');
    await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});
    await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});
    await fulfillCapturedPayment(order,payment);
    const stored=await db.commerceOrder.findUnique({where:{id:order.id}});
    assert.equal(stored.status,'refunded');assert.equal(stored.providerPaymentId,payment.id);assert.equal(stored.fulfilledAt,null);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
    assert.equal(await db.currencyTransaction.count({where:{userId:user.id}}),0);
    assert.equal(await db.auditLog.count({where:{userId:user.id,action:'cosmetic_payment_refunded'}}),1);
  });

  await t.test('Concurrent capture and full refund cannot leave paid coins after the order is refunded',async()=>{
    for(let index=0;index<4;index++){
      const user=await fixture(),{order}=await pending(user),payment=captured(order,'pay_'+run+'CaptureRace'+index);
      const results=await Promise.allSettled([fulfillCapturedPayment(order,payment),webhook(order,{...payment,status:'refunded',amount_refunded:order.amount})]);
      assert(results.every(result=>result.status==='fulfilled'),JSON.stringify(results));
      assert.equal((await db.commerceOrder.findUnique({where:{id:order.id}})).status,'refunded');
      assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
    }
  });

  await t.test('A paid cosmetic pass refunds its entitlement and future claims require ownership again',async()=>{
    const user=await fixture(),{order}=await pending(user,'season-pass'),payment=captured(order,'pay_'+run+'Pass');
    await fulfillCapturedPayment(order,payment);
    assert.equal(await db.rewardClaim.count({where:{userId:user.id,kind:'premium_pass',key:order.seasonId}}),1);
    await webhook(order,{...payment,status:'refunded',amount_refunded:order.amount});
    assert.equal(await db.rewardClaim.count({where:{userId:user.id,kind:'premium_pass',key:order.seasonId}}),0);
    await assert.rejects(claimJourney(user.id,1,'premium'),code('PASS_REQUIRED'));
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
  });

  await t.test('Ad reward tokens are hashed, numeric Google units are accepted and parallel SSV delivery credits once',async()=>{
    const user=await fixture(),session=await startAdReward(user.id,{env:adEnv}),stored=await db.adRewardSession.findUnique({where:{id:session.sessionId}});
    assert.notEqual(stored.tokenHash,session.customData);assert.equal(stored.tokenHash,hashToken(session.customData));
    assert.equal((await adRewardStatus(user.id,session.sessionId)).status,'pending');
    await googleAdmobKeys({fetcher:keyFetcher,force:true});
    const url=callback({custom_data:session.customData,user_id:user.id,transaction_id:'transaction_'+run+'Once',reward_amount:'999999'});
    const results=await Promise.all([admobCallback(url,{env:adEnv,fetcher:keyFetcher}),admobCallback(url,{env:adEnv,fetcher:keyFetcher})]);
    assert.equal(results.filter(result=>result.duplicate).length,1);
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,275);
    assert.deepEqual(await adRewardStatus(user.id,session.sessionId),{sessionId:session.sessionId,status:'granted',coins:25});
    assert.equal(await db.currencyTransaction.count({where:{reference:'admob:transaction_'+run+'Once'}}),1);
    const other=await fixture();await assert.rejects(adRewardStatus(other.id,session.sessionId),code('NOT_FOUND'));
  });

  await t.test('Ad sessions enforce daily concurrency caps, token ownership, matching units and expiration',async()=>{
    const user=await fixture();const issued=await Promise.allSettled(Array.from({length:6},()=>startAdReward(user.id,{env:adEnv})));
    assert.equal(issued.filter(result=>result.status==='fulfilled').length,5);
    assert.equal(issued.find(result=>result.status==='rejected').reason.code,'AD_DAILY_LIMIT');
    const session=issued.find(result=>result.status==='fulfilled').value,params={custom_data:session.customData,user_id:user.id,ad_unit:'5224354917',transaction_id:'transaction_'+run+'Invalid'};
    await assert.rejects(grantVerifiedAdReward({...params,user_id:'another-player'},{env:adEnv}),code('AD_CALLBACK'));
    await assert.rejects(grantVerifiedAdReward({...params,ad_unit:'0000000000'},{env:adEnv}),code('AD_CALLBACK'));
    await db.adRewardSession.update({where:{id:session.sessionId},data:{expiresAt:new Date(Date.now()-1)}});
    await assert.rejects(grantVerifiedAdReward(params,{env:adEnv}),code('AD_EXPIRED'));
    assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,250);
  });

  await t.test('Entering a Ranked queue or match disables ad offers and settlement',async()=>{
    const user=await fixture(),session=await startAdReward(user.id,{env:adEnv}),previous=globalThis.__elementalArena;
    try{
      globalThis.__elementalArena={queueStatus:()=>({queued:true,mode:'ranked'})};
      await assert.rejects(startAdReward(user.id,{env:adEnv}),code('RANKED_ADS'));
      await assert.rejects(grantVerifiedAdReward({custom_data:session.customData,user_id:user.id,ad_unit:'5224354917',transaction_id:'transaction_'+run+'Ranked'},{env:adEnv}),code('RANKED_ADS'));
      globalThis.__elementalArena={queueStatus:()=>({queued:false})};
      const match=await db.match.create({data:{mode:'ranked',ruleset:'classic-v1',state:{},initialState:{}}});matchIds.push(match.id);
      await db.user.update({where:{id:user.id},data:{activeMatchId:match.id}});
      await assert.rejects(startAdReward(user.id,{env:adEnv}),code('RANKED_ADS'));
      await db.user.update({where:{id:user.id},data:{activeMatchId:null}});
    }finally{globalThis.__elementalArena=previous;}
  });

  await t.test('Provider webhooks accept signed server-to-server requests without browser Origin and reject forgery',async()=>{
    const old=process.env.RAZORPAY_WEBHOOK_SECRET;process.env.RAZORPAY_WEBHOOK_SECRET=env.RAZORPAY_WEBHOOK_SECRET;
    try{
      const id='fixture-no-origin-'+run,raw='{\n "event":"fixture.ignored", "note":"★"\n}';eventIds.push('razorpay:'+id);
      const request=signature=>new Request('https://game.example.test/api/payments/razorpay/webhook',{method:'POST',headers:{'x-razorpay-event-id':id,'x-razorpay-signature':signature,'content-type':'application/json'},body:raw});
      assert.equal((await handleAPI(request(hmac(raw,env.RAZORPAY_WEBHOOK_SECRET)))).status,200);
      assert.equal((await handleAPI(request('0'.repeat(64)))).status,403);
      assert.equal(await db.providerEvent.count({where:{id:'razorpay:'+id}}),1);
    }finally{if(old===undefined)delete process.env.RAZORPAY_WEBHOOK_SECRET;else process.env.RAZORPAY_WEBHOOK_SECRET=old;}
  });
});
