import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,tick} from '../src/lib/game-engine/index.js';
import {analyzeReplay,replayCellLabel} from '../src/lib/replay-analysis.js';
import {POWER_CATALOG} from '../src/lib/game-engine/index.js';
import {createPowerTraining,trainingChoices,TRAINING_PLAYER} from '../src/lib/power-training.js';

function recorder(options={}){
 const initialState=createGame({players:[{id:'a',name:'Aster',loadout:['fire','shield','portal']},{id:'b',name:'Boreal',loadout:['fire','shield','ice']}],now:1000,...options});let state=initialState;const actions=[];
 return {replay:()=>({initialState,actions}),act:(actorId,action)=>{state=applyAction(state,actorId,{...action,revision:state.revision},state.turnStartedAt+100);actions.push({sequence:actions.length+1,actorId,action,event:state.lastEvent,state,createdAt:new Date(state.lastEvent.at).toISOString()});return state;},timeout:()=>{state=tick(state,state.turnDeadline);actions.push({sequence:actions.length+1,actorId:null,action:{type:'timeout'},event:state.lastEvent,state});return state;}};
}

test('replay analysis describes a shield absorption without inventing mark destruction',()=>{
 const log=recorder();log.act('a',{type:'place',cell:0});log.act('b',{type:'place',cell:4});log.act('a',{type:'power',powerId:'shield',cell:0});log.act('b',{type:'power',powerId:'fire',cell:0});
 const result=analyzeReplay(log.replay()),blast=result.timeline.at(-1);
 assert.match(blast.description,/protected mark remained/);assert.equal(blast.board[0],'a');assert.equal(blast.notes[0].kind,'counter');assert.equal(result.players[0].powers,1);assert.equal(result.players[1].powers,1);
});

test('round-winning snapshots preserve the winning board when the engine opens the next round',()=>{
 const log=recorder();log.act('a',{type:'place',cell:0});log.act('b',{type:'place',cell:3});log.act('a',{type:'place',cell:1});log.act('b',{type:'place',cell:4});const state=log.act('a',{type:'place',cell:2});
 assert.equal(state.round,2);assert.deepEqual(state.board,Array(9).fill(null));
 const item=analyzeReplay(log.replay()).timeline.at(-1);assert.equal(item.kind,'round');assert.deepEqual(item.board.slice(0,3),['a','a','a']);assert.match(item.notes[0].text,/Aster won round 1 with three in a row/);
});

test('placement threats distinguish blocking and a new three-in-a-row threat',()=>{
 const log=recorder({mode:'classic'});log.act('a',{type:'place',cell:0});log.act('b',{type:'place',cell:4});log.act('a',{type:'place',cell:1});log.act('b',{type:'place',cell:2});
 const result=analyzeReplay(log.replay());assert.match(result.timeline[2].notes[0].text,/C1/);assert.ok(result.timeline[3].notes.some(note=>note.kind==='counter'&&note.text.includes('C1')));
});

test('portal transfer and timeout remain identifiable after server event wrappers change',()=>{
 const log=recorder();log.act('a',{type:'place',cell:0});log.act('b',{type:'place',cell:4});log.act('a',{type:'power',powerId:'portal',from:0,to:8});log.timeout();
 const result=analyzeReplay(log.replay());assert.match(result.timeline[2].description,/A1 to C3/);assert.equal(result.timeline[3].title,'Turn clock expired');assert.match(result.timeline[3].description,/Boreal/);assert.equal(result.players[0].averageThinkingMs,100);
});

test('cell coordinates and empty replays never create fictional highlights',()=>{
 assert.equal(replayCellLabel(0),'A1');assert.equal(replayCellLabel(4),'B2');assert.equal(replayCellLabel(8),'C3');assert.equal(replayCellLabel(20),'the selected cell');assert.deepEqual(analyzeReplay(null).highlights,[]);
});

test('every released power has a replay explanation grounded in its real transition',()=>{
 const expected={fire:/removed the enemy mark/,shield:/protected the mark/,portal:/moved a mark/,ice:/anchored the enemy mark/,crystal:/temporarily locked/,surge:/restoring up to three/,lightning:/Electricity terrain/,time:/8 seconds.*retained the main action/,shadow:/exchanged the friendly mark/,meteor:/Scorched terrain/,bloom:/genuine lost-mark restoration charge/,mirror:/reflective defense/,phantom:/did not count.*winning line/,gravity:/shifted eligible marks/,poison:/one action to cleanse/,purify:/Ownership and beneficial shields remained/,dragon:/in row|in column/,eclipse:/Darkness terrain/,tide:/transferred enemy-created terrain/,wind:/one-square diagonal/,root:/vulnerable to destruction/,echo:/exact mark's restoration charge/};
 for(const power of POWER_CATALOG){
  const initialState=createPowerTraining(power.id),action=trainingChoices(initialState,power.id)[0],state=applyAction(initialState,TRAINING_PLAYER,action,initialState.turnStartedAt+100);
  const replay=analyzeReplay({initialState,actions:[{actorId:TRAINING_PLAYER,action,event:state.lastEvent,state}]});
  assert.match(replay.timeline[0].description,expected[power.id],power.name);assert.equal(replay.powerCount,1);
 }
});

test('replay timing honors the enlarged Time Warp deadline without inventing another move',()=>{
 const initialState=createPowerTraining('time'),warp=trainingChoices(initialState,'time')[0],warped=applyAction(initialState,TRAINING_PLAYER,warp,initialState.turnStartedAt+100),placement={type:'place',cell:2,revision:warped.revision},state=applyAction(warped,TRAINING_PLAYER,placement,warped.turnStartedAt+25000);
 const result=analyzeReplay({initialState,actions:[{actorId:TRAINING_PLAYER,action:warp,event:warped.lastEvent,state:warped},{actorId:TRAINING_PLAYER,action:placement,event:state.lastEvent,state}]});
 assert.equal(result.timeline[1].thinkingMs,25000);assert.equal(result.players[0].placements,1);assert.equal(result.players[0].powers,1);
});

test('poison replay reports delayed destruction and shield survival from authoritative events',()=>{
 for(const response of ['place','shield']){
  let initialState=createPowerTraining('poison');
  initialState.players[1].loadout=['fire','shield','purify'];
  const curse=trainingChoices(initialState,'poison')[0],cursed=applyAction(initialState,TRAINING_PLAYER,curse,initialState.turnStartedAt+100);
  const action=response==='place'?{type:'place',cell:1,revision:cursed.revision}:{type:'power',powerId:'shield',cell:4,revision:cursed.revision};
  const state=applyAction(cursed,'training-o',action,cursed.turnStartedAt+100);
  const result=analyzeReplay({initialState,actions:[{actorId:TRAINING_PLAYER,action:curse,event:cursed.lastEvent,state:cursed},{actorId:'training-o',action,event:state.lastEvent,state}]}),note=result.timeline[1].notes.find(note=>note.text.startsWith('Poison resolved'));
  assert.ok(note);assert.match(note.text,response==='place'?/cursed mark was destroyed/:/shield absorbed the delayed hit/);
  assert.equal(state.board[4],response==='place'?null:'training-o');
 }
});
