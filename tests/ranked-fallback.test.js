import 'dotenv/config';
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from '../src/server/db.mjs';
import {ArenaService,ratingDelta} from '../src/server/arena.mjs';
import {createPlayer} from '../src/server/players.mjs';
import {requestedBoardSize,rankedBotDifficulty,rankedBotPolicy,RANKED_BOT_FALLBACK_MS,RANKED_BOT_MESSAGE} from '../src/server/matchmaking-policy.mjs';
const isolated=Boolean(process.env.DATABASE_URL&&/^\/ea_(?:test|ci)_/.test(new URL(process.env.DATABASE_URL).pathname));
const service=new ArenaService();service.scheduleAI=()=>{};
const users=[],matches=[],run=randomUUID().slice(0,8);
async function player(cups=0){const user=await createPlayer({guest:true,name:`Bot ${run} ${users.length}`});users.push(user.id);await db.playerRating.update({where:{userId:user.id},data:{cups}});return user;}
async function finish(match){matches.push(match.id);return service.surrender(match.participants.find(p=>p.userId).userId,match.id,`finish-${match.id}`);}
after(async()=>{service.close();if(!isolated)return;if(matches.length)await db.match.deleteMany({where:{id:{in:matches}}});const outside=await db.match.findMany({where:{participants:{some:{userId:{in:users}}}},select:{id:true}});if(outside.length)await db.match.deleteMany({where:{id:{in:outside.map(m=>m.id)}}});if(users.length){await db.auditLog.deleteMany({where:{userId:{in:users}}});await db.user.deleteMany({where:{id:{in:users}}});}await db.$disconnect();});
test('Ranked policy validates sizes, discloses bots and starts at Hard with trophy tiers',()=>{
 assert.equal(RANKED_BOT_FALLBACK_MS,25000);assert.equal(RANKED_BOT_MESSAGE,"If no real world players are found you'll play against a competitive bot");
 for(const [cups,level] of [[0,'hard'],[449,'hard'],[450,'expert'],[1399,'expert'],[1400,'extreme'],[2499,'extreme'],[2500,'nightmare']])assert.equal(rankedBotDifficulty(cups),level);
 for(const size of [3,4,5,6])assert.equal(requestedBoardSize(size),size);assert.equal(requestedBoardSize(),3);
 for(const bad of [2,7,'4',4.5])assert.throws(()=>requestedBoardSize(bad),e=>e.code==='VALIDATION');
 assert.equal(rankedBotPolicy(2500).type,'competitive-bot');assert.equal(rankedBotPolicy(2500).message,RANKED_BOT_MESSAGE);assert.equal(rankedBotPolicy(2500).difficulty,'nightmare');
});
test('Real database Ranked fallback, board partitioning, cancellation and settlement',{skip:!isolated,timeout:60000},async t=>{
 const a=await player(600),b=await player(605);
 await t.test('different sizes do not pair, and quick/classic never get fallback bots',async()=>{
  await service.joinQueue(a.id,{mode:'quick',boardSize:4});await service.joinQueue(b.id,{mode:'quick',boardSize:5});
  assert.equal(service.queue.size,2);for(const q of service.queue.values())q.joinedAt-=60000;await service.pairQueue();assert.equal(service.queue.size,2);assert.equal(service.matches.size,0);service.leaveQueue(a.id);service.leaveQueue(b.id);
 });
 await t.test('an eligible human has priority over an expired fallback',async()=>{
  await service.joinQueue(a.id,{mode:'ranked',boardSize:4});service.queue.get(a.id).joinedAt-=30000;
  await service.joinQueue(b.id,{mode:'ranked',boardSize:4});const match=[...service.matches.values()].find(m=>m.status==='active');
  assert(match);assert.equal(match.participants.every(p=>!p.isAI),true);assert.equal(match.state.board.length,16);await finish(match);
 });
 await t.test('all sizes persist one explicitly identified competitive bot without a fake user',async()=>{
  for(const size of [3,4,5,6]){
   await service.joinQueue(a.id,{mode:'ranked',boardSize:size});assert.equal(service.queueStatus(a.id).rankedBot.message,RANKED_BOT_MESSAGE);service.queue.get(a.id).joinedAt-=25001;await service.pairQueue();
   const match=[...service.matches.values()].find(m=>m.status==='active');assert(match);assert.equal(match.state.board.length,size*size);assert.equal(match.mode,'ranked');assert.equal(match.difficulty,'expert');assert.equal(match.state.maxRounds,size===3?3:1);
   const snap=service.snapshot(match,a.id),bot=snap.participants.find(p=>p.isAI);assert.equal(bot.type,'competitive-bot');assert.equal(bot.userId,null);assert.equal(await db.user.findUnique({where:{id:bot.id}}),null);assert.equal(snap.rankedBot.difficulty,'expert');
   const before=await db.playerRating.findUnique({where:{userId:a.id}});await finish(match);const stored=await db.match.findUnique({where:{id:match.id},include:{participants:true,result:true}});const human=stored.participants.find(p=>p.userId===a.id);
   assert.equal(human.cupChange,ratingDelta(human.initialCups,bot.initialCups,0));assert.equal(human.coinReward,0);assert.equal(human.xpReward,10);assert.equal((await db.playerRating.findUnique({where:{userId:a.id}})).cups,before.cups+human.cupChange);
   const duplicate=await service.surrender(a.id,match.id,`finish-${match.id}`);assert.equal(duplicate.state.status,'finished');assert.equal((await db.playerRating.findUnique({where:{userId:a.id}})).cups,before.cups+human.cupChange);
  }
 });
 await t.test('cancel while joining cannot resurrect a queue entry',async()=>{
  let resume,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>resume=r),original=service.assertAvailable;
  service.assertAvailable=async(...args)=>{entered();await gate;return original.apply(service,args);};
  try{const joined=service.joinQueue(a.id,{mode:'ranked',boardSize:6});await ready;service.leaveQueue(a.id);resume();await assert.rejects(joined,e=>e.code==='QUEUE_CANCELLED');assert.equal(service.queue.has(a.id),false);}finally{service.assertAvailable=original;}
 });
 await t.test('cancel a claimed fallback before commit creates no match or player occupancy',async()=>{
  await service.joinQueue(a.id,{mode:'ranked',boardSize:5});service.queue.get(a.id).joinedAt-=30000;
  let resume,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>resume=r),original=service.createMatch;
  service.createMatch=async(...args)=>{entered();await gate;return original.apply(service,args);};
  const before=await db.match.count({where:{participants:{some:{userId:a.id}}}});try{const pairing=service.pairQueue();await ready;service.leaveQueue(a.id);resume();await pairing;assert.equal(await db.match.count({where:{participants:{some:{userId:a.id}}}}),before);assert.equal((await db.user.findUnique({where:{id:a.id}})).activeMatchId,null);assert.equal(service.queueClaims.size,0);}finally{service.createMatch=original;}
 });
});
