import {createHash} from 'node:crypto';
import {db} from './db.mjs';
import {fail,cleanText} from './security.mjs';
import {serialize} from './arena.mjs';
import {walletCredit} from './players.mjs';
import {checkoutConfigured,commerceProducts,validHmac,validateCapturedPayment,passCoinPrice} from './commerce-policy.mjs';

export async function listCommerceProducts(userId=null,env=process.env) {
  const products=commerceProducts(env),bundleIds=products.flatMap(product=>product.cosmeticIds||[]);
  const [catalog,inventory]=await Promise.all([
    db.cosmeticItem.findMany({where:{id:{in:bundleIds},enabled:true},select:{id:true}}),
    userId?db.playerInventory.findMany({where:{userId},select:{cosmeticId:true}}):[],
  ]);
  const enabled=new Set(catalog.map(item=>item.id)),owned=new Set(inventory.map(item=>item.cosmeticId));
  return {products:products.filter(product=>!product.cosmeticIds||product.cosmeticIds.every(id=>enabled.has(id))).map(product=>product.cosmeticIds?{...product,ownedCount:product.cosmeticIds.filter(id=>owned.has(id)).length,itemCount:product.cosmeticIds.length,partialOwnershipPolicy:'Full collection price applies. Owned styles are retained; duplicates do not grant coins.'}:product),ownedCosmeticIds:[...owned]};
}

function bundleSnapshot(product) {
  if(product.kind!=='bundle')return null;
  const ids=product.cosmeticIds;
  fail(Array.isArray(ids)&&ids.length===9&&new Set(ids).size===9&&ids.every(id=>typeof id==='string'&&id.length<=80),'PAYMENT_CONFIG','The cosmetic collection is not configured correctly.',503);
  return [...ids];
}
async function lockWallet(tx,userId) {
  const [wallet]=await tx.$queryRaw`SELECT coins FROM CurrencyWallet WHERE userId=${userId} FOR UPDATE`;
  fail(wallet,'PAYMENT_INVALID','The player wallet was not found.',409);
  return wallet;
}

export async function activeSeason(tx=db) {
  return tx.season.findFirst({where:{active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}},orderBy:{startsAt:'desc'}});
}
export async function buyPassWithCoins(userId) {
  return db.$transaction(async tx=>{
    const season=await activeSeason(tx);fail(season,'NO_ACTIVE_SEASON','There is no active cosmetic pass.',409);
    const key=season.id;
    fail(!await tx.rewardClaim.findUnique({where:{userId_kind_key:{userId,kind:'premium_pass',key}}}),'ALREADY_OWNED','You own this season cosmetic pass.');
    fail(!await tx.commerceOrder.findFirst({where:{userId,sku:'season-pass',seasonId:key,status:'pending',providerOrderId:{not:null},createdAt:{gt:new Date(Date.now()-30*60000)}}}),'PAYMENT_PENDING','A cash pass checkout is pending. Complete it or wait 30 minutes before using coins.',409);
    const changed=await tx.currencyWallet.updateMany({where:{userId,coins:{gte:passCoinPrice}},data:{coins:{decrement:passCoinPrice}}});
    fail(changed.count===1,'INSUFFICIENT_COINS',`Earn ${passCoinPrice} cosmetic coins to unlock this pass.`);
    await tx.rewardClaim.create({data:{userId,kind:'premium_pass',key,coins:0}});
    const wallet=await tx.currencyWallet.findUnique({where:{userId}});
    await tx.currencyTransaction.create({data:{userId,amount:-passCoinPrice,balanceAfter:wallet.coins,reason:'cosmetic_pass_purchase',reference:`pass:${userId}:${key}`}});
    return {ok:true,seasonId:key,wallet};
  },{isolationLevel:'Serializable'});
}
async function razorpay(route,{method='GET',body,env=process.env,fetcher=fetch}={}) {
  fail(checkoutConfigured(env),'CHECKOUT_UNAVAILABLE','Payments are not enabled yet. Earned cosmetic coins remain available.',503);
  const response=await fetcher(`https://api.razorpay.com/v1/${route}`,{method,headers:{authorization:`Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  fail(response.ok,'PAYMENT_PROVIDER','Razorpay could not complete this request. Please retry later.',502);
  return response.json();
}
function checkoutDetails(order,env=process.env) {
  return {orderId:order.id,providerOrderId:order.providerOrderId,keyId:env.RAZORPAY_KEY_ID,amount:order.amount,currency:order.currency,name:'Elemental Arena',description:commerceProducts(env).find(p=>p.id===order.sku)?.name||'Cosmetic purchase',sku:order.sku,status:order.status,cosmeticIds:order.cosmeticIds||[],testMode:env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')||false};
}
export async function createCheckout(userId,{sku,requestId},{env=process.env,fetcher=fetch}={}) {
  fail(cleanText(requestId,8,80),'VALIDATION','A unique purchase request ID is required.');
  const product=commerceProducts(env).find(p=>p.id===sku);fail(product,'INVALID_PRODUCT','Choose a listed cosmetic product.');
  fail(checkoutConfigured(env),'CHECKOUT_UNAVAILABLE','Payments are not enabled yet. Earned coins remain available.',503);
  const user=await db.user.findUnique({where:{id:userId}});fail(user&&!user.guest,'REGISTER_REQUIRED','Register your account before making a payment.');
  return serialize(`checkout:${userId}`,async()=>{
    let order=await db.commerceOrder.findUnique({where:{userId_requestId:{userId,requestId}}});
    if(order){fail(order.sku===sku,'REQUEST_CONFLICT','This request was used for a different product.');fail(order.providerOrderId,'ORDER_PREPARING','This order is still being prepared. Try again shortly.',409);return checkoutDetails(order,env);}
    const season=sku==='season-pass'?await activeSeason():null;
    const cosmeticIds=bundleSnapshot(product);
    if(cosmeticIds) {
      const catalog=await db.cosmeticItem.findMany({where:{id:{in:cosmeticIds},enabled:true}});
      fail(catalog.length===cosmeticIds.length&&catalog.every(item=>['avatar','board','marks','arena','frame','banner','effect','emote','title'].includes(item.type)),'PRODUCT_UNAVAILABLE','This complete cosmetic collection is unavailable.',409);
      const owned=await db.playerInventory.count({where:{userId,cosmeticId:{in:cosmeticIds}}});
      fail(owned<cosmeticIds.length,'ALREADY_OWNED','You already own every style in this collection.');
      const pending=await db.commerceOrder.findFirst({where:{userId,sku,fulfilledAt:null,status:'pending',providerOrderId:{not:null}}});
      if(pending)return checkoutDetails(pending,env);
    }
    if(sku==='season-pass') {
      fail(season,'NO_ACTIVE_SEASON','There is no active cosmetic pass.',409);
      fail(!await db.rewardClaim.findUnique({where:{userId_kind_key:{userId,kind:'premium_pass',key:season.id}}}),'ALREADY_OWNED','You own this season cosmetic pass.');
      const pending=await db.commerceOrder.findFirst({where:{userId,sku,seasonId:season.id,fulfilledAt:null,status:'pending',providerOrderId:{not:null}}});
      if(pending)return checkoutDetails(pending,env);
    }
    order=await db.commerceOrder.create({data:{userId,requestId,sku,amount:product.amount,currency:product.currency,coins:product.coins,seasonId:season?.id,...(cosmeticIds?{cosmeticIds}:{})}});
    try {
      const external=await razorpay('orders',{method:'POST',body:{amount:order.amount,currency:order.currency,receipt:`ea_${order.id}`.slice(0,40),notes:{game_order:order.id,game_user:userId}},env,fetcher});
      fail(/^order_[A-Za-z0-9]+$/.test(external.id||'')&&external.amount===order.amount&&external.currency===order.currency,'PAYMENT_PROVIDER','Razorpay returned an invalid order.',502);
      order=await db.commerceOrder.update({where:{id:order.id},data:{providerOrderId:external.id}});
      return checkoutDetails(order,env);
    } catch(error) {await db.commerceOrder.update({where:{id:order.id},data:{status:'failed'}});throw error;}
  });
}
export async function fulfillCapturedPayment(order,payment) {
  validateCapturedPayment(order,payment);
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM CommerceOrder WHERE id=${order.id} FOR UPDATE`;
    const current=await tx.commerceOrder.findUnique({where:{id:order.id}});
    fail(current,'NOT_FOUND','The game order was not found.',404);
    validateCapturedPayment(current,payment);
    fail(!current.providerPaymentId||current.providerPaymentId===payment.id,'PAYMENT_MISMATCH','A different payment is recorded for this order.',403);
    const changed=await tx.commerceOrder.updateMany({where:{id:current.id,fulfilledAt:null,status:{not:'refunded'}},data:{status:'paid',providerPaymentId:payment.id,fulfilledAt:new Date()}});
    if(!changed.count)return {ok:true,duplicate:true,orderId:order.id};
    order=current;
    if(order.sku.startsWith('bundle-')) {
      const ids=order.cosmeticIds;
      fail(Array.isArray(ids)&&ids.length===9&&new Set(ids).size===9&&ids.every(id=>typeof id==='string'&&id.length<=80),'PAYMENT_INVALID','The order has no valid cosmetic collection snapshot.',409);
      await lockWallet(tx,order.userId);
      const owned=new Set((await tx.playerInventory.findMany({where:{userId:order.userId,cosmeticId:{in:ids}},select:{cosmeticId:true}})).map(item=>item.cosmeticId));
      const newItems=ids.filter(id=>!owned.has(id));
      if(newItems.length)await tx.playerInventory.createMany({data:newItems.map(cosmeticId=>({userId:order.userId,cosmeticId,cashCreated:true}))});
      await tx.commerceCosmeticGrant.createMany({data:ids.map(cosmeticId=>({orderId:order.id,cosmeticId}))});
      await tx.auditLog.create({data:{userId:order.userId,action:'cosmetic_collection_granted',details:{orderId:order.id,cosmeticIds:ids,newItems:ids.length-owned.size,retainedItems:owned.size,coinsGranted:0}}});
    } else if(order.sku==='season-pass') {
      fail(order.seasonId,'PAYMENT_INVALID','The pass order has no season.',409);
      await tx.rewardClaim.upsert({where:{userId_kind_key:{userId:order.userId,kind:'premium_pass',key:order.seasonId}},create:{userId:order.userId,kind:'premium_pass',key:order.seasonId,coins:0},update:{}});
      // A provider order remains payable after its checkout window. If the
      // player later used earned coins, return that charge exactly once.
      const coinPurchase=await tx.currencyTransaction.findUnique({where:{reference:`pass:${order.userId}:${order.seasonId}`}});
      const reference=`pass-reconciled:${order.userId}:${order.seasonId}`;
      if(coinPurchase&&!await tx.currencyTransaction.findUnique({where:{reference}})){
        await walletCredit(tx,order.userId,passCoinPrice,'cosmetic_pass_reconciliation',reference);
        await tx.auditLog.create({data:{userId:order.userId,action:'cosmetic_pass_coins_returned',details:{orderId:order.id,seasonId:order.seasonId,coins:passCoinPrice}}});
      }
    } else await walletCredit(tx,order.userId,order.coins,'razorpay_cosmetic_coins',`razorpay:${payment.id}`);
    await tx.auditLog.create({data:{userId:order.userId,action:'cosmetic_payment_captured',details:{orderId:order.id,sku:order.sku,amount:order.amount,currency:order.currency}}});
    return {ok:true,orderId:order.id,status:'paid'};
  },{isolationLevel:'ReadCommitted'});
}
export async function verifyCheckout(userId,body,options={}) {
  const env=options.env||process.env;
  const order=await db.commerceOrder.findFirst({where:{id:body.orderId,userId}});fail(order?.providerOrderId,'NOT_FOUND','Your game order was not found.',404);
  fail(/^pay_[A-Za-z0-9]+$/.test(body.razorpay_payment_id||'')&&body.razorpay_order_id===order.providerOrderId,'PAYMENT_INVALID','Payment does not belong to this order.',403);
  fail(validHmac(`${order.providerOrderId}|${body.razorpay_payment_id}`,body.razorpay_signature,env.RAZORPAY_KEY_SECRET),'PAYMENT_SIGNATURE','Payment signature is invalid.',403);
  const payment=await razorpay(`payments/${body.razorpay_payment_id}`,options);
  return fulfillCapturedPayment(order,payment);
}
export async function orderStatus(userId,orderId,options={}) {
  let order=await db.commerceOrder.findFirst({where:{id:orderId,userId}});fail(order,'NOT_FOUND','Your game order was not found.',404);
  if(order.status==='pending'&&order.providerOrderId&&checkoutConfigured(options.env||process.env)) {
    const payments=await razorpay(`orders/${order.providerOrderId}/payments`,options);
    const payment=payments.items?.find(p=>p.status==='captured');if(payment)await fulfillCapturedPayment(order,payment);
    order=await db.commerceOrder.findUnique({where:{id:orderId}});
  }
  return {orderId:order.id,sku:order.sku,status:order.status,fulfilledAt:order.fulfilledAt,cosmeticIds:order.cosmeticIds||[]};
}
async function revokeCollection(tx,order) {
  await lockWallet(tx,order.userId);
  const grants=await tx.commerceCosmeticGrant.findMany({where:{orderId:order.id},include:{cosmetic:true}});
  const inventory=await tx.playerInventory.findMany({where:{userId:order.userId,cosmeticId:{in:grants.map(grant=>grant.cosmeticId)}}});
  const owned=new Map(inventory.map(item=>[item.cosmeticId,item])),revoked=[],retained=[];
  for(const grant of grants) {
    const item=owned.get(grant.cosmeticId);
    if(!item)continue;
    const independent=await tx.shopPurchase.count({where:{userId:order.userId,cosmeticId:grant.cosmeticId}});
    const otherPaid=await tx.commerceCosmeticGrant.count({where:{cosmeticId:grant.cosmeticId,orderId:{not:order.id},order:{userId:order.userId,status:'paid',fulfilledAt:{not:null},refundedAt:null}}});
    if(!item.cashCreated||independent||otherPaid) {
      retained.push(grant.cosmeticId);
      if(independent&&item.cashCreated)await tx.playerInventory.update({where:{userId_cosmeticId:{userId:order.userId,cosmeticId:grant.cosmeticId}},data:{cashCreated:false}});
      continue;
    }
    await tx.playerInventory.delete({where:{userId_cosmeticId:{userId:order.userId,cosmeticId:grant.cosmeticId}}});
    revoked.push(grant.cosmeticId);
    const field={avatar:'avatar',board:'equippedBoard',marks:'equippedMark',frame:'equippedFrame',banner:'equippedBanner',arena:'equippedArena',effect:'equippedEffect',emote:'equippedEmote',title:'title'}[grant.cosmetic.type];
    if(field) {
      const expected=field==='title'?grant.cosmetic.name:grant.cosmeticId;
      // Titles are displayed by name. Preserve a separately owned title with
      // the same display name, if a future catalog adds one.
      if(field==='title'&&await tx.playerInventory.count({where:{userId:order.userId,cosmetic:{type:'title',name:expected}}}))continue;
      const fallback={avatar:'avatar-void',equippedBoard:'board-void',equippedMark:'marks-neon',title:'Rookie Strategist'}[field]??null;
      await tx.playerProfile.updateMany({where:{userId:order.userId,[field]:expected},data:{[field]:fallback}});
    }
  }
  return {revokedCosmeticIds:revoked,retainedCosmeticIds:retained};
}
async function reverseRefund(order,payment) {
  if(payment.status!=='refunded'||payment.amount_refunded!==order.amount)return {ignored:true};
  fail(/^pay_[A-Za-z0-9]+$/.test(payment.id||'')&&payment.order_id===order.providerOrderId&&payment.amount===order.amount&&payment.currency===order.currency,'PAYMENT_MISMATCH','Refund does not match the game order.',403);
  return db.$transaction(async tx=>{
    // Capture and refund share this order lock. Read fulfillment after acquiring
    // it, so a concurrent capture cannot be mistaken for an unfulfilled order.
    await tx.$queryRaw`SELECT id FROM CommerceOrder WHERE id=${order.id} FOR UPDATE`;
    const current=await tx.commerceOrder.findUnique({where:{id:order.id}});
    fail(current&&(!current.providerPaymentId||payment.id===current.providerPaymentId),'PAYMENT_MISMATCH','Refund does not match the recorded payment.',403);
    const changed=await tx.commerceOrder.updateMany({where:{id:order.id,refundedAt:null},data:{status:'refunded',providerPaymentId:payment.id,refundedAt:new Date()}});
    if(!changed.count)return {duplicate:true};
    if(!current.fulfilledAt) {
      await tx.auditLog.create({data:{userId:current.userId,action:'cosmetic_payment_refunded',details:{orderId:current.id,beforeFulfillment:true,outstandingCoins:0,reviewRequired:false}}});
      return {ok:true,beforeFulfillment:true};
    }
    order=current;
    let outstandingCoins=0,collectionRefund={};
    if(order.sku.startsWith('bundle-'))collectionRefund=await revokeCollection(tx,order);
    else if(order.sku==='season-pass')await tx.rewardClaim.deleteMany({where:{userId:order.userId,kind:'premium_pass',key:order.seasonId}});
    else {
      // Refunds and cosmetic spending serialize on the same wallet balance.
      const [wallet]=await tx.$queryRaw`SELECT coins FROM CurrencyWallet WHERE userId=${order.userId} FOR UPDATE`;
      fail(wallet,'PAYMENT_INVALID','The player wallet was not found.',409);
      const deduct=Math.min(wallet.coins,order.coins);outstandingCoins=order.coins-deduct;
      const updated=await tx.currencyWallet.update({where:{userId:order.userId},data:{coins:{decrement:deduct}}});
      await tx.currencyTransaction.create({data:{userId:order.userId,amount:-deduct,balanceAfter:updated.coins,reason:'razorpay_refund',reference:`refund:${payment.id}`}});
    }
    await tx.auditLog.create({data:{userId:order.userId,action:'cosmetic_payment_refunded',details:{orderId:order.id,outstandingCoins,...collectionRefund,reviewRequired:outstandingCoins>0||order.sku==='season-pass'}}});
    return {ok:true,...collectionRefund};
  },{isolationLevel:'ReadCommitted'});
}
export async function razorpayWebhook(raw,signature,eventId,options={}) {
  const env=options.env||process.env;fail(validHmac(raw,signature,env.RAZORPAY_WEBHOOK_SECRET),'PAYMENT_SIGNATURE','Webhook signature is invalid.',403);
  let event;try{event=JSON.parse(raw);}catch{fail(false,'INVALID_JSON','Webhook JSON is invalid.');}
  const key=`razorpay:${cleanText(eventId,1,100)||createHash('sha256').update(raw).digest('hex')}`;
  if(await db.providerEvent.findUnique({where:{id:key}}))return {ok:true,duplicate:true};
  const entity=event.payload?.payment?.entity;
  if(['payment.captured','order.paid','payment.refunded'].includes(event.event)&&entity?.order_id&&entity?.id) {
    const order=await db.commerceOrder.findUnique({where:{providerOrderId:entity.order_id}});
    if(order){fail(/^pay_[A-Za-z0-9]+$/.test(entity.id),'PAYMENT_INVALID','Invalid payment identifier.',403);const payment=await razorpay(`payments/${entity.id}`,options);fail(payment.id===entity.id,'PAYMENT_MISMATCH','Provider payment identity does not match the event.',403);if(event.event==='payment.refunded')await reverseRefund(order,payment);else await fulfillCapturedPayment(order,payment);}
  }
  await db.providerEvent.upsert({where:{id:key},create:{id:key,provider:'razorpay',type:String(event.event||'unknown').slice(0,80)},update:{}});
  return {ok:true};
}
