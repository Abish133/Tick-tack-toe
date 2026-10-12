import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,tick} from '../src/lib/game-engine/index.js';
import {analyzeReplay,replayCellLabel} from '../src/lib/replay-analysis.js';

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
