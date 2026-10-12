import 'dotenv/config';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {Server} from 'socket.io';
import {io as socketClient} from 'socket.io-client';
import {db} from '../src/server/db.mjs';
import {ArenaService} from '../src/server/arena.mjs';
import {createPlayer,updateLoadout} from '../src/server/players.mjs';
import {createSession,sessionCookie,allowedOrigins} from '../src/server/security.mjs';

// These real socket fixtures run only against an explicitly isolated database.
// The CI service satisfies this condition; a normal public/local game does not.
const configured=Boolean(process.env.DATABASE_URL&&/^\/ea_(ci|test)_/.test(new URL(process.env.DATABASE_URL).pathname));
const origin=allowedOrigins()[0],run=randomUUID().slice(0,8);
let service,server,io,base;const users=[],sockets=new Map(),matchIds=[];
const emit=(socket,event,payload)=>new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error(`No socket ack for ${event}.`)),10000);
  socket.emit(event,payload,result=>{clearTimeout(timeout);resolve(result);});
});

before(async()=>{
  if(!configured)return;
  await db.$connect();service=new ArenaService();server=http.createServer();
  io=new Server(server,{cors:{origin,credentials:true}});service.attach(io);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
  for(let index=0;index<2;index++){
    const user=await createPlayer({guest:true,name:`Transport ${run} ${index}`});users.push(user);
    await updateLoadout(user.id,['gravity','dragon','surge']);
    const cookie=sessionCookie(await createSession(user.id)).split(';')[0];
    const socket=socketClient(base,{transports:['websocket'],extraHeaders:{origin,cookie},reconnection:false});
    sockets.set(user.id,socket);
    await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
  }
});
after(async()=>{
  if(!configured)return;
  for(const socket of sockets.values())socket.close();service?.close();
  if(io)await new Promise(resolve=>io.close(resolve));
  if(server)await new Promise(resolve=>server.close(resolve));
  if(matchIds.length)await db.match.deleteMany({where:{id:{in:matchIds}}});
  if(users.length){const ids=users.map(user=>user.id);await db.auditLog.deleteMany({where:{userId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});}
  await db.$disconnect();
});

async function freshMatch(){
  const match=await service.createMatch(users.map(user=>user.id),{mode:'friend',ruleset:'elemental'});matchIds.push(match.id);
  for(const user of users){const result=await emit(sockets.get(user.id),'match:join',{matchId:match.id});assert.equal(result.ok,true,JSON.stringify(result));}
  return {matchId:match.id,state:match.state};
}
async function move(snapshot,cell,label){
  const result=await emit(sockets.get(snapshot.state.currentPlayerId),'match:move',{matchId:snapshot.matchId,cell,revision:snapshot.state.revision,requestId:`transport-${run}-${label}`});
  assert.equal(result.ok,true,JSON.stringify(result));return result;
}
async function finish(snapshot,label){
  const result=await emit(sockets.get(users[0].id),'match:surrender',{matchId:snapshot.matchId,requestId:`transport-${run}-finish-${label}`});
  assert.equal(result.ok,true,JSON.stringify(result));
}

test('Gravity direction survives the real Socket.IO transport and persists its resolved movement',{skip:!configured,timeout:20000},async()=>{
  let snapshot=await freshMatch();const actor=snapshot.state.currentPlayerId;
  snapshot=await move(snapshot,0,'gravity-own');snapshot=await move(snapshot,8,'gravity-enemy');
  const request={matchId:snapshot.matchId,powerId:'gravity',direction:'right',revision:snapshot.state.revision,requestId:`transport-${run}-gravity`};
  const result=await emit(sockets.get(actor),'match:power',request);
  assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.state.board[0],null);assert.equal(result.state.board[1],actor);
  const action=await db.matchAction.findUnique({where:{matchId_requestId:{matchId:snapshot.matchId,requestId:request.requestId}}});
  assert.equal(action.action.direction,'right');assert.equal(action.event.powerId,'gravity');
  const duplicate=await emit(sockets.get(actor),'match:power',request);assert.equal(duplicate.ok,true);assert.equal(duplicate.state.revision,result.state.revision);
  assert.equal(await db.matchAction.count({where:{matchId:snapshot.matchId,requestId:request.requestId}}),1);
  await finish(result,'gravity');
});

test('Dragon row/index survives the real transport and invalid line parameters are rejected',{skip:!configured,timeout:20000},async()=>{
  let snapshot=await freshMatch();const actor=snapshot.state.currentPlayerId;
  snapshot=await move(snapshot,4,'dragon-own');snapshot=await move(snapshot,8,'dragon-enemy');
  const invalid=await emit(sockets.get(actor),'match:power',{matchId:snapshot.matchId,powerId:'dragon',axis:'diagonal',index:2,revision:snapshot.state.revision,requestId:`transport-${run}-dragon-invalid`});
  assert.equal(invalid.ok,false);assert.equal((await service.getMatch(snapshot.matchId)).sequence,snapshot.state.revision);
  const request={matchId:snapshot.matchId,powerId:'dragon',axis:'row',index:2,revision:snapshot.state.revision,requestId:`transport-${run}-dragon`};
  const result=await emit(sockets.get(actor),'match:power',request);
  assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.state.board[8],null);assert.equal(result.state.board[4],actor);
  const action=await db.matchAction.findUnique({where:{matchId_requestId:{matchId:snapshot.matchId,requestId:request.requestId}}});
  assert.equal(action.action.axis,'row');assert.equal(action.action.index,2);assert.equal(action.event.resolvedCell,8);
  const recovered=await emit(sockets.get(actor),'match:reconnect',{matchId:snapshot.matchId});assert.equal(recovered.ok,true);assert.deepEqual(recovered.state.board,result.state.board);
  await finish(result,'dragon');
});
