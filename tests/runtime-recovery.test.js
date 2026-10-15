import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {superviseRuntime} from '../scripts/runtime-supervisor.mjs';
import {runtimeErrorDetails,transientRuntimeError,TRANSIENT_RUNTIME_EXIT} from '../src/server/runtime-errors.mjs';

test('runtime diagnostics expose identifiers without driver messages, URLs or SQL',()=>{
  const error=Object.assign(new Error('mysql://private:password@host SELECT private'),{code:'ETIMEDOUT',errno:110,syscall:'connect',sql:'private',password:'private'});
  assert.deepEqual(runtimeErrorDetails(error),{errorName:'Error',errorCode:'ETIMEDOUT',errorNumber:110,syscall:'connect'});
  assert.equal(JSON.stringify(runtimeErrorDetails(error)).includes('private'),false);
  assert.deepEqual(runtimeErrorDetails({name:'mysql://private',code:'a secret'}),{errorName:'Error'});
  assert.equal(transientRuntimeError(error),true);
  assert.equal(transientRuntimeError({cause:{code:'ECONNRESET'}}),true);
  assert.equal(transientRuntimeError({code:'ER_ACCESS_DENIED_ERROR'}),false);
  assert.equal(transientRuntimeError(new Error('programming error')),false);
});

function fakeWorkers(codes){
  const workers=[];
  return {workers,spawnWorker:()=>{
    const child=new EventEmitter();workers.push(child);child.kill=signal=>{child.signal=signal;queueMicrotask(()=>child.emit('exit',0,signal));};
    if(codes.length){const code=codes.shift();queueMicrotask(()=>child.emit('exit',code,null));}
    return child;
  }};
}

test('transient worker exits retry with bounded backoff and clean takeover exits stop',async()=>{
  const f=fakeWorkers([TRANSIENT_RUNTIME_EXIT,TRANSIENT_RUNTIME_EXIT,TRANSIENT_RUNTIME_EXIT,0]);
  const waits=[],events=[],signals=new EventEmitter();
  const code=await superviseRuntime({...f,args:['fixture'],signals,baseDelayMs:2,maxDelayMs:5,log:entry=>events.push(entry),sleep:async ms=>{waits.push(ms);}});
  assert.equal(code,0);assert.equal(f.workers.length,4);assert.deepEqual(waits,[2,4,5]);
  assert.deepEqual(events.map(entry=>entry.event),['arena_recovery_retry','arena_recovery_retry','arena_recovery_retry']);
  assert.equal(signals.listenerCount('SIGTERM'),0);
});

test('fatal configuration and programming failures are not hidden by recovery retries',async()=>{
  const f=fakeWorkers([1]);
  const code=await superviseRuntime({...f,args:['fixture'],signals:new EventEmitter(),log:()=>assert.fail('Unexpected recovery retry')});
  assert.equal(code,1);assert.equal(f.workers.length,1);
});

test('container signals are forwarded to the worker and never start a replacement',async()=>{
  const f=fakeWorkers([]),signals=new EventEmitter();
  const running=superviseRuntime({...f,args:['fixture'],signals,log:()=>assert.fail('Unexpected restart')});
  signals.emit('SIGTERM');assert.equal(await running,0);assert.equal(f.workers.length,1);
  assert.equal(f.workers[0].signal,'SIGTERM');assert.equal(signals.listenerCount('SIGTERM'),0);
});

test('shutdown during recovery backoff cancels the pending restart promptly',async()=>{
  const f=fakeWorkers([TRANSIENT_RUNTIME_EXIT]),signals=new EventEmitter();let entered;
  const waiting=new Promise(resolve=>{entered=resolve;});
  const running=superviseRuntime({...f,args:['fixture'],signals,baseDelayMs:30000,log:()=>entered()});
  await waiting;await delay(1);signals.emit('SIGTERM');assert.equal(await running,143);
  assert.equal(f.workers.length,1);assert.equal(signals.listenerCount('SIGTERM'),0);
});
