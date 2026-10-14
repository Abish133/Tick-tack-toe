import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,legalActions,chooseAIAction,detectOutcome,POWER_CATALOG} from '../src/lib/game-engine/index.js';
import {getWinningLines,scoresForBoard,boardSizeOf} from '../src/lib/game-engine/geometry.js';
import {createPowerTraining,TRAINING_PLAYER} from '../src/lib/power-training.js';
import {effectCellPosition,effectLinePosition,isEffectCell} from '../src/lib/power-effect-layout.js';
import {replayCellLabel} from '../src/lib/replay-analysis.js';
const players=[{id:'x',name:'X'},{id:'o',name:'O'}];
for(const size of [4,5,6]){
 test(`${size}×${size} counts all triplets, overlapping lines and full-board ties`,()=>{
  const lines=getWinningLines(size);assert.equal(lines.length,4*(size-2)*(size-1));assert.equal(new Set(lines.map(line=>line.join(','))).size,lines.length);
  for(const line of lines){assert.equal(line.length,3);assert(line.every(cell=>cell>=0&&cell<size*size));const board=Array(size*size).fill(null);line.forEach(cell=>board[cell]='x');assert.equal(scoresForBoard(board,players.map(p=>p.id),size).x,1);assert.equal(detectOutcome(board,{scoringMode:'triplet-score',playerIds:['x','o']}).ended,false);}
  const board=Array(size*size).fill(null);for(let cell=0;cell<4;cell++)board[cell]='x';assert.equal(scoresForBoard(board,['x','o'],size).x,2);
  const allX=Array(size*size).fill('x'),full=detectOutcome(allX,{scoringMode:'triplet-score',playerIds:['x','o']});assert.equal(full.winnerId,'x');assert.equal(full.ended,true);assert.equal(full.scores.x,lines.length);
  if(size%2===0){const tie=Array.from({length:size*size},(_,i)=>i%size%2?'o':'x');const result=detectOutcome(tie,{scoringMode:'triplet-score',playerIds:['x','o']});assert.equal(result.scores.x,result.scores.o);assert.equal(result.winnerId,null);}
 });
 test(`${size}×${size} complete Classic game keeps playing after a line and records final scores`,()=>{
  let state=createGame({mode:'classic',boardSize:size,rounds:1,players,now:1000});
  for(let cell=0;cell<size*size;cell++){state=applyAction(state,state.currentPlayerId,{type:'place',cell,revision:state.revision},state.turnStartedAt+1);if(cell<size*size-1)assert.equal(state.status,'active');}
  const scores=scoresForBoard(state.board,['x','o'],size);assert.equal(state.status,'finished');assert.equal(state.roundHistory[0].reason,'board-full-score');assert.deepEqual(state.roundHistory[0].scores,scores);assert.equal(state.matchWinnerId,scores.x===scores.o?null:scores.x>scores.o?'x':'o');assert.equal(state.boardSize,size);assert.equal(state.maxRounds,1);
 });
 test(`${size}×${size} scores fall when a power removes a completed line`,()=>{
  const state=createGame({boardSize:size,rounds:1,players:[{id:'x',loadout:['fire','shield','portal']},{id:'o'}],now:1000});state.board[0]='o';state.board[1]='o';state.board[2]='o';
  const next=applyAction(state,'x',{type:'power',powerId:'fire',cell:2,revision:0},1001);assert.equal(next.roundScores.o,0);assert.equal(next.lastEvent.scoreChanges.o,-1);assert.equal(next.status,'active');assert.equal(state.board[2],'o');
 });
 test(`${size}×${size} search remains bounded and targets geometry reaches the last cell`,()=>{
  const state=createGame({mode:'classic',boardSize:size,rounds:1,players,now:1000});const start=performance.now(),action=chooseAIAction(state,'nightmare',{maxTimeMs:50,maxNodes:1000});assert(action);assert.equal(action.type,'place');assert(action.cell>=0&&action.cell<size*size);assert(performance.now()-start<2000);
  assert.equal(boardSizeOf(state),size);assert.equal(replayCellLabel(size*size-1,size),`${'ABCDEF'[size-1]}${size}`);assert.equal(isEffectCell(size*size-1,size),true);assert.equal(isEffectCell(size*size,size),false);const point=effectCellPosition(size*size-1,size);assert(parseFloat(point.left)>80);assert(parseFloat(point.top)>80);assert.equal(effectLinePosition('row',size-1,size).top,point.top);
 });
 for(const power of POWER_CATALOG)test(`${power.name} resolves legally on ${size}×${size} without truncating arrays`,()=>{
  const original=createPowerTraining(power.id),state=structuredClone(original),map=cell=>Math.floor(cell/3)*size+cell%3;
  const expand=(items,empty)=>{const result=Array.from({length:size*size},()=>structuredClone(empty));items.forEach((item,cell)=>result[map(cell)]=structuredClone(item));return result;};
  state.boardSize=size;state.scoringMode='triplet-score';state.maxRoundActions=size*size+24;state.board=expand(original.board,null);state.effects=expand(original.effects,createGame({boardSize:size,players}).effects[0]);state.markOrigins=expand(original.markOrigins,null);
  for(const origins of Object.values(state.markOrigins))if(origins?.cell!==undefined)origins.cell=map(origins.cell);
  for(const charges of Object.values(state.restorationCharges))for(const charge of charges){charge.cell=map(charge.cell);if(charge.origin?.cell!==undefined)charge.origin.cell=map(charge.origin.cell);}
  for(const item of state.history){if(item.cell!==undefined)item.cell=map(item.cell);if(item.action?.cell!==undefined)item.action.cell=map(item.action.cell);}
  state.roundScores=scoresForBoard(state.board,state.players.map(p=>p.id),size);const before=structuredClone(state),actions=legalActions(state,TRAINING_PLAYER).filter(a=>a.powerId===power.id);assert(actions.length,`${power.id} needs valid targets`);
  const next=applyAction(state,TRAINING_PLAYER,actions[0],state.turnStartedAt+100);assert.deepEqual(state,before);assert.equal(next.board.length,size*size);assert.equal(next.effects.length,size*size);assert.equal(next.markOrigins.length,size*size);assert.equal(next.revision,state.revision+1);assert.equal(next.uses[TRAINING_PLAYER][power.id],1);
 });
}
test('legacy 3×3 states hydrate without changing first-line wins, clocks or power limits',()=>{
 assert.throws(()=>createGame({players,maxRoundActions:61}),e=>e.code==='INVALID_ACTION_CAP');assert.throws(()=>createGame({players,boardSize:4,scoringMode:'line'}),e=>e.code==='INVALID_SCORING_MODE');assert.equal(createGame({players,boardSize:6}).maxRounds,1);
 const state=createGame({mode:'classic',rounds:1,players,now:1000});for(const key of ['boardSize','scoringMode','roundScores','matchBankMs'])delete state[key];state.board=['x','x',null,'o','o',null,null,null,null];const next=applyAction(state,'x',{type:'place',cell:2,revision:0},1001);assert.equal(next.status,'finished');assert.equal(next.matchWinnerId,'x');assert.equal(next.boardSize,3);assert.equal(next.roundHistory[0].reason,'line');assert.equal(next.remainingMs.x,119999);
});
