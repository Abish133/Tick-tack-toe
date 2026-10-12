import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from '../src/server/db.mjs';
import {createPlayer,seasonJourney,claimJourney,purchaseCosmetic,equipCosmetic} from '../src/server/players.mjs';
import {buyPassWithCoins,activeSeason} from '../src/server/commerce.mjs';
import {premiumTiers,passCoinPrice} from '../src/server/commerce-policy.mjs';
import {RANKED_POWER_IDS} from '../src/lib/game-engine/powers.js';

test('premium season journey uses entitlement, real seasonal XP and transactional cosmetic claims',{skip:!process.env.DATABASE_URL},async t=>{
 let user;
 try{
  user=await createPlayer({name:`Pass${randomUUID().slice(0,8)}`,guest:true});
  const season=await activeSeason();assert.ok(season,'Run the seed before integration tests.');
  assert.equal(await db.playerPower.count({where:{userId:user.id}}),RANKED_POWER_IDS.length);
  await db.playerProfile.update({where:{userId:user.id},data:{xp:5000}});
  await db.seasonParticipation.create({data:{seasonId:season.id,userId:user.id,xp:0}});
  await t.test('account XP cannot unlock either season track and a pass is required for premium claims',async()=>{
   const journey=await seasonJourney(user.id);assert.equal(journey.xp,0);assert.equal(journey.accountXp,5000);assert.equal(journey.premiumOwned,false);assert.equal(journey.passCoinPrice,passCoinPrice);assert.equal(journey.tiers.length,5);assert.equal(journey.premiumTiers.length,5);
   assert.ok(journey.tiers.every(tier=>!tier.unlocked));assert.ok(journey.premiumTiers.every(tier=>!tier.unlocked&&tier.cosmetic?.id===tier.cosmeticId));
   await assert.rejects(()=>claimJourney(user.id,1,'premium'),error=>error.code==='PASS_REQUIRED');
   await assert.rejects(()=>claimJourney(user.id,1,'arbitrary'),error=>error.code==='VALIDATION');
   assert.equal(await db.rewardClaim.count({where:{userId:user.id}}),0);
  });
  await t.test('earned coins purchase one season entitlement without granting power or reward XP',async()=>{
   await db.currencyWallet.update({where:{userId:user.id},data:{coins:1500}});
   const purchase=await buyPassWithCoins(user.id);assert.equal(purchase.wallet.coins,1500-passCoinPrice);assert.equal(purchase.seasonId,season.id);
   await assert.rejects(()=>buyPassWithCoins(user.id),error=>error.code==='ALREADY_OWNED');
   assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,600);
   assert.equal(await db.rewardClaim.count({where:{userId:user.id,kind:'premium_pass',key:season.id}}),1);
   const journey=await seasonJourney(user.id);assert.equal(journey.premiumOwned,true);assert.equal(journey.xp,0);
   await assert.rejects(()=>claimJourney(user.id,1,'premium'),error=>error.code==='NOT_COMPLETE');
  });
  await t.test('free and premium rewards at the same level are independent and cannot repeat',async()=>{
   await db.seasonParticipation.update({where:{seasonId_userId:{seasonId:season.id,userId:user.id}},data:{xp:100}});
   const free=await claimJourney(user.id,1);assert.equal(free.coins,40);assert.equal(free.track,'free');
   const premium=await claimJourney(user.id,1,'premium');assert.equal(premium.coins,25);assert.equal(premium.cosmeticId,'frame-eclipse');
   await assert.rejects(()=>claimJourney(user.id,1,'premium'),error=>error.code==='P2002');
   await assert.rejects(()=>claimJourney(user.id,1),error=>error.code==='P2002');
   const journey=await seasonJourney(user.id);assert.equal(journey.tiers[0].claimed,true);assert.equal(journey.premiumTiers[0].claimed,true);assert.equal(journey.premiumTiers[1].unlocked,false);
   assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,665);
  });
  await t.test('exclusive reward IDs cannot be acquired through direct shop requests at zero price',async()=>{
   for(const tier of premiumTiers)await assert.rejects(()=>purchaseCosmetic(user.id,tier.cosmeticId,`exclusive-${tier.level}-${randomUUID()}`),error=>error.code==='SEASON_EXCLUSIVE');
   assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,665);
   assert.equal(await db.shopPurchase.count({where:{userId:user.id}}),0);
  });
  await t.test('racing claims award each exclusive cosmetic and coin amount exactly once',async()=>{
   await db.seasonParticipation.update({where:{seasonId_userId:{seasonId:season.id,userId:user.id}},data:{xp:3500}});
   const race=await Promise.allSettled([claimJourney(user.id,2,'premium'),claimJourney(user.id,2,'premium')]);
   assert.equal(race.filter(result=>result.status==='fulfilled').length,1);assert.equal(race.filter(result=>result.status==='rejected').length,1);
   for(const tier of premiumTiers.slice(2))await claimJourney(user.id,tier.level,'premium');
   assert.equal(await db.playerInventory.count({where:{userId:user.id,cosmeticId:{in:premiumTiers.map(tier=>tier.cosmeticId)}}}),5);
   assert.equal(await db.rewardClaim.count({where:{userId:user.id,kind:'premium_season'}}),5);
   assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,1040);
  });
  await t.test('claimed styles equip through inventory ownership and revoked entitlement blocks further claims',async()=>{
   for(const [id,field]of[['frame-eclipse','equippedFrame'],['banner-solar','equippedBanner'],['marks-galaxy','equippedMark'],['effect-dragon','equippedEffect'],['arena-starlight','equippedArena']]){const equipped=await equipCosmetic(user.id,id);assert.equal(equipped.profile[field],id);}
   await db.rewardClaim.deleteMany({where:{userId:user.id,kind:'premium_pass',key:season.id}});
   assert.equal((await seasonJourney(user.id)).premiumOwned,false);
   await assert.rejects(()=>claimJourney(user.id,5,'premium'),error=>error.code==='PASS_REQUIRED');
   assert.equal((await db.currencyWallet.findUnique({where:{userId:user.id}})).coins,1040);
  });
 }finally{
  if(user)await db.user.delete({where:{id:user.id}});
  await db.$disconnect();
 }
});
