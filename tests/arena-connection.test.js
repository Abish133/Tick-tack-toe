import test from "node:test";
import assert from "node:assert/strict";
import { sendArenaRequest, savedBattleTarget, sessionConnectionError } from "../src/lib/arena-connection.mjs";

test("disconnected moves never enter the Socket.IO buffer", async () => {
  let sent = false;
  await assert.rejects(sendArenaRequest({ connected:false, timeout(){sent=true;} }, "match:move", {cell:1}), {code:"OFFLINE"});
  assert.equal(sent, false);
});

test("acknowledged actions use volatile transport and preserve authoritative failures", async () => {
  const sent=[];
  const socket={connected:true, timeout(ms){assert.equal(ms,12000);return {volatile:{emit(event,payload,ack){sent.push({event,payload});ack(null,{ok:false,error:{code:"STALE_REVISION",message:"Request a current state before acting."}});}}};}};
  await assert.rejects(sendArenaRequest(socket,"match:move",{cell:2,revision:7}), {code:"STALE_REVISION"});
  assert.deepEqual(sent,[{event:"match:move",payload:{cell:2,revision:7}}]);
});

test("an ambiguous acknowledgement is surfaced without replaying the action", async () => {
  let sent=0;
  const socket={connected:true,timeout(){return {volatile:{emit(event,payload,ack){sent++;ack(new Error("timeout"));}}};}};
  await assert.rejects(sendArenaRequest(socket,"match:power",{powerId:"fire"}),{code:"ACK_TIMEOUT"});
  assert.equal(sent,1);
});

test("saved battle recovery is scoped to the signed-in player", () => {
  const raw=JSON.stringify({userId:"player-one",matchId:"match-one"});
  assert.equal(savedBattleTarget(raw,"player-one"),"match-one");
  assert.equal(savedBattleTarget(raw,"player-two"),null);
  assert.equal(savedBattleTarget("broken","player-one"),null);
  assert.equal(savedBattleTarget(JSON.stringify({userId:"player-one",matchId:42}),"player-one"),null);
  assert.equal(sessionConnectionError({code:"UNAUTHENTICATED"}),true);
  assert.equal(sessionConnectionError(new Error("Sign in to connect.")),true);
  assert.equal(sessionConnectionError(new Error("The arena is restarting. Please reconnect.")),false);
});
