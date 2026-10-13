import 'dotenv/config';
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from '../src/server/db.mjs';
import {ArenaService,serialize} from '../src/server/arena.mjs';
import {createPlayer} from '../src/server/players.mjs';

const isolated=Boolean(process.env.DATABASE_URL&&/^\/ea_(?:ci|test)_/.test(new URL(process.env.DATABASE_URL).pathname));
const run=randomUUID().slice(0,8),users=[],matches=[],seasons=[];
const service=new ArenaService();
// Queue the real AI operation explicitly so the competing actions have a
// deterministic order rather than depending on a wall-clock timer.
service.scheduleAI=()=>{};
after(async()=>{
  service.close();
  if(!isolated)return;
  if(matches.length)await db.match.deleteMany({where:{id:{in:matches}}});
  if(seasons.length)await db.season.deleteMany({where:{id:{in:seasons}}});
  if(users.length){await db.auditLog.deleteMany({where:{userId:{in:users}}});await db.user.deleteMany({where:{id:{in:users}}});}
  await db.$disconnect();
});
async function fixture(ruleset='classic'){
  const player=await createPlayer({guest:true,name:`Race ${run} ${users.length}`});users.push(player.id);
  const match=await service.createAI(player.id,ruleset,'beginner');matches.push(match.id);
  return {player,match};
}

test('Canonical surrender waits for an interleaved AI move and duplicate requests settle exactly once',{skip:!isolated},async()=>{
  const {player,match}=await fixture();let current=match;
  if(current.state.currentPlayerId===player.id){await service.act(player.id,current.id,{type:'place',cell:0,revision:current.state.revision},`race-place-${run}`);current=await service.getMatch(current.id);}
  const ai=current.participants.find(participant=>participant.isAI),initialRevision=current.state.revision;
  assert.equal(current.state.currentPlayerId,ai.engineId);
  let unlock,entered;
  const ready=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{unlock=resolve;});
  const blocker=serialize(`match:${current.id}`,async()=>{entered();await gate;});await ready;
  const aiMove=service.runAI(current.id,ai.engineId),requestId=`race-surrender-${run}`;
  const first=service.surrender(player.id,current.id,requestId),retry=service.surrender(player.id,current.id,requestId);
  await Promise.resolve();unlock();
  const results=await Promise.allSettled([blocker,aiMove,first,retry]);
  assert(results.every(result=>result.status==='fulfilled'),JSON.stringify(results.map(result=>result.status==='rejected'?{code:result.reason.code,message:result.reason.message}:{status:result.status})));
  const stored=await db.match.findUnique({where:{id:current.id},include:{result:true,participants:true,actions:{orderBy:{sequence:'asc'}}}});
  assert.equal(stored.status,'finished');assert.equal(stored.result.reason,'surrender');
  const action=stored.actions.find(action=>action.requestId===requestId);assert.equal(action.action.revision,initialRevision+1);
  assert.equal(stored.actions.filter(action=>action.action.type==='surrender').length,1);
  assert.equal(await db.playerStats.findUnique({where:{userId:player.id}}).then(stats=>stats.aiPlayed),1);
  assert.equal(await db.playerProfile.findUnique({where:{userId:player.id}}).then(profile=>profile.xp),10);
  assert.equal(await db.currencyWallet.findUnique({where:{userId:player.id}}).then(wallet=>wallet.coins),250);
  const duplicate=await service.surrender(player.id,current.id,requestId);assert.equal(duplicate.state.status,'finished');
  await assert.rejects(service.act(player.id,current.id,{type:'place',cell:4,revision:stored.state.revision},requestId),error=>error.code==='REQUEST_CONFLICT');
});

test('Canonical surrender uses the post-timeout state while client moves still reject stale revisions',{skip:!isolated},async()=>{
  const {player,match}=await fixture('elemental');
  const expired={...match.state,turnDeadline:Date.now()-1000};
  await db.match.update({where:{id:match.id},data:{state:expired}});service.matches.delete(match.id);
  const requestId=`timeout-surrender-${run}`,result=await service.surrender(player.id,match.id,requestId);
  assert.equal(result.state.status,'finished');
  const actions=await db.matchAction.findMany({where:{matchId:match.id},orderBy:{sequence:'asc'}});
  assert.equal(actions.length,2);assert.equal(actions[0].action.type,'timeout');assert.equal(actions[1].action.type,'surrender');assert.equal(actions[1].action.revision,actions[0].sequence);
  assert.equal((await service.surrender(player.id,match.id,requestId)).state.revision,result.state.revision);
  const next=await fixture();let latest=next.match;
  if(latest.state.currentPlayerId!==next.player.id){await service.runAI(latest.id,latest.state.currentPlayerId);latest=await service.getMatch(latest.id);}
  const revision=latest.state.revision,cell=latest.state.board.findIndex(mark=>mark===null);
  await service.act(next.player.id,next.match.id,{type:'place',cell,revision},`strict-place-${run}`);
  await assert.rejects(service.act(next.player.id,next.match.id,{type:'place',cell:4,revision},`strict-stale-${run}`),error=>error.code==='STALE_REVISION');
  const finished=await service.surrender(next.player.id,next.match.id);
  assert.equal((await service.surrender(next.player.id,next.match.id)).state.revision,finished.state.revision,'The default surrender intent must also be stable across retries');
});

test('Concurrent completed matches recover from a real InnoDB season-index deadlock with one action, settlement and reward',{skip:!isolated,timeout:30000},async()=>{
  const season=await db.season.create({data:{id:`race-season-${run}`,name:'Isolated deadlock fixture',active:false,startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+60000)}});seasons.push(season.id);
  const pairs=[];
  for(let pair=0;pair<2;pair++){
    const players=[];
    for(let index=0;index<2;index++){const player=await createPlayer({guest:true,name:`Race ${run} ${users.length}`});users.push(player.id);players.push(player);}
    const match=await service.createMatch(players.map(player=>player.id),{mode:'friend',ruleset:'classic'});matches.push(match.id);
    await db.match.update({where:{id:match.id},data:{seasonId:season.id}});service.matches.delete(match.id);
    pairs.push({match:await service.getMatch(match.id),players,requestId:`deadlock-${run}-${pair}`});
  }
  const originalSettle=service.settle,originalBroadcast=service.broadcast,attempts=new Map(),broadcasts=new Map();
  let arrived=0,release,deadlocks=0;
  const barrier=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Deadlock fixture transactions did not meet at the barrier')),2000);release=()=>{clearTimeout(timer);resolve();};});
  service.settle=async function(tx,match,state){
    const attempt=(attempts.get(match.id)||0)+1;attempts.set(match.id,attempt);
    if(attempt===1){
      // These absent keys share the same empty (seasonId,userId) index gap.
      // Both real Serializable transactions acquire compatible gap locks;
      // their subsequent inserts create an actual InnoDB deadlock.
      await tx.$queryRaw`SELECT id FROM SeasonParticipation WHERE seasonId=${season.id} AND userId=${match.participants[0].userId} FOR UPDATE`;
      arrived++;if(arrived===2)release();await barrier;
    }
    try{return await originalSettle.call(this,tx,match,state);}catch(error){if(error.code==='P2034')deadlocks++;throw error;}
  };
  service.broadcast=async function(match,event){const key=`${match.id}:${event}`;broadcasts.set(key,(broadcasts.get(key)||0)+1);return originalBroadcast.call(this,match,event);};
  try{
    const results=await Promise.allSettled(pairs.map(pair=>service.surrender(pair.players[0].id,pair.match.id,pair.requestId)));
    assert(results.every(result=>result.status==='fulfilled'&&result.value.state.status==='finished'),JSON.stringify(results.map(result=>result.status==='rejected'?{code:result.reason.code,message:result.reason.message}:{status:result.status})));
    assert(deadlocks>=1,'The fixture must exercise an actual InnoDB deadlock, not only concurrent success');
    assert([...attempts.values()].some(count=>count>=2));assert([...attempts.values()].every(count=>count<=4));
    for(const pair of pairs){
      const stored=await db.match.findUnique({where:{id:pair.match.id},include:{actions:true,result:true,participants:true}});
      assert.equal(stored.sequence,1);assert.equal(stored.actions.length,1);assert.equal(stored.actions[0].requestId,pair.requestId);assert.equal(stored.actions[0].action.revision,0);
      assert.equal(stored.result.reason,'surrender');assert.equal(await db.matchResult.count({where:{matchId:stored.id}}),1);
      assert.equal(broadcasts.get(`${stored.id}:match:finished`),1);assert.equal(broadcasts.get(`${stored.id}:match:rewardSettled`),1);
      for(const participant of stored.participants){
        const stats=await db.playerStats.findUnique({where:{userId:participant.userId}}),profile=await db.playerProfile.findUnique({where:{userId:participant.userId}});
        assert.equal(stats.played,1);assert.equal(profile.xp,participant.outcome==='win'?60:30);
        const participation=await db.seasonParticipation.findUnique({where:{seasonId_userId:{seasonId:season.id,userId:participant.userId}}});assert.equal(participation.xp,profile.xp);
        const ledger=await db.currencyTransaction.findMany({where:{userId:participant.userId}}),wallet=await db.currencyWallet.findUnique({where:{userId:participant.userId}});
        assert.equal(ledger.filter(entry=>entry.reference===`match:${stored.id}:${participant.userId}`).length,1);assert.equal(wallet.coins,250+ledger.reduce((sum,entry)=>sum+entry.amount,0));
      }
      assert.equal((await service.surrender(pair.players[0].id,stored.id,pair.requestId)).state.revision,1);
    }
  }finally{service.settle=originalSettle;service.broadcast=originalBroadcast;}
});
