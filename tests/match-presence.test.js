import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaService} from '../src/server/arena.mjs';

test('match snapshots report connected engine identities without treating spectators as players',()=>{
  const service=new ArenaService();
  const match={id:'presence-fixture',mode:'friend',ruleset:'classic',state:{board:Array(9).fill(null),players:[{id:'engine-a'},{id:'engine-b'}]},
    participants:[{engineId:'engine-a',userId:'human-a',isAI:false},{engineId:'engine-b',userId:'human-b',isAI:false}]};
  assert.deepEqual(service.snapshot(match,'human-a').connectedPlayerIds,[]);
  service.presence.set('human-a',2);service.presence.set('spectator',1);
  assert.deepEqual(service.snapshot(match,'human-a').connectedPlayerIds,['engine-a']);
  service.presence.set('human-b',1);
  assert.deepEqual(service.snapshot(match,'human-a').connectedPlayerIds,['engine-a','engine-b']);
  service.presence.delete('human-a');
  assert.deepEqual(service.snapshot(match,'human-b').connectedPlayerIds,['engine-b']);
  match.participants[0]={engineId:'competitive-bot',userId:null,isAI:true};
  assert.deepEqual(service.snapshot(match,'human-b').connectedPlayerIds,['competitive-bot','engine-b']);
  assert.deepEqual(match.state.board,Array(9).fill(null),'Presence snapshots cannot mutate game state.');
  service.close();
});
