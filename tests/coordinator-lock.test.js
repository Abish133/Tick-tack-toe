import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {CoordinatorLock,coordinatorLockNames} from '../src/server/coordinator-lock.mjs';
import {manageArenaLifecycle} from '../src/server/coordinator-lifecycle.mjs';

const url='mysql://fixture:fixture@localhost:3306/ea_test_coordinator';
function fixture() {
  const owners=new Map(),connections=[];
  const connect=async()=>{
    const connection=new EventEmitter();connection.id=connections.length+1;connections.push(connection);
    connection.query=async({sql,values})=>{
      if(connection.dead)throw new Error('Connection closed');
      if(sql.includes('GET_LOCK')){
        const held=owners.get(values[0]);if(held&&held!==connection.id)return [[{acquired:0}]];
        owners.set(values[0],connection.id);return [[{acquired:1}]];
      }
      if(sql.includes('RELEASE_LOCK')){
        if(owners.get(values[0])===connection.id){owners.delete(values[0]);return [[{released:1}]];}
        return [[{released:0}]];
      }
      if(sql.includes('IS_USED_LOCK'))return [[{owner:owners.get(values[0])??null,id:connection.id,requester:owners.get(values[1])??null}]];
      return [[{id:connection.id}]];
    };
    connection.destroy=()=>{connection.dead=true;for(const[key,id]of owners)if(id===connection.id)owners.delete(key);};
    connection.end=async()=>{connection.destroy();connection.emit('end');};
    return connection;
  };
  const lock=options=>new CoordinatorLock({databaseUrl:url,namespace:randomUUID(),connect,pollMs:2,heartbeatMs:5,waitMs:1000,...options});
  return {owners,connections,connect,lock};
}

test('lock names are database-specific, bounded, and independent of credentials or proxy hostname',()=>{
  const names=coordinatorLockNames(url);
  assert.deepEqual(names,coordinatorLockNames('mysql://other:secret@private.alias:3307/ea_test_coordinator'));
  assert.deepEqual(names,coordinatorLockNames('mysql://other:secret@private.alias:3307/EA_TEST_COORDINATOR'));
  assert.notDeepEqual(names,coordinatorLockNames(url+'_other'));
  assert.notDeepEqual(names,coordinatorLockNames(url,'owned-test-namespace'));
  assert.ok(Object.values(names).every(key=>key.length<=64));
  assert.equal(JSON.stringify(names).includes('fixture'),false);
  assert.throws(()=>coordinatorLockNames('postgres://a:b@localhost/db'));
});

test('rolling takeover requests a drain, never owns concurrently, and waits for accepted work',async()=>{
  const f=fixture(),namespace=randomUUID();let finish,requests=0;
  const drain=new Promise(resolve=>{finish=resolve;});
  const first=f.lock({namespace,onHandoff:async()=>{requests++;await drain;await first.release();}});
  const second=f.lock({namespace});
  await first.acquire();const acquiring=second.acquire();
  try {
    await delay(25);assert.equal(requests,1);assert.equal(first.owned,true);assert.equal(second.owned,false);
    assert.equal(f.owners.get(first.names.owner),first.connectionId);
    finish();await acquiring;
    assert.equal(first.owned,false);assert.equal(second.owned,true);
    assert.notEqual(first.connectionId,second.connectionId);assert.equal(f.owners.has(second.names.request),false);
  }finally{finish();await first.release();await second.release();}
});

test('a third deployment cannot queue behind an in-progress takeover',async()=>{
  const f=fixture(),namespace=randomUUID();let finish;
  const drain=new Promise(resolve=>{finish=resolve;});
  const first=f.lock({namespace,onHandoff:async()=>{await drain;await first.release();}});
  const second=f.lock({namespace}),third=f.lock({namespace});
  await first.acquire();const acquiring=second.acquire();
  try{
    await delay(15);await assert.rejects(third.acquire(),/already in progress/);
    assert.equal(first.owned,true);assert.equal(f.owners.get(first.names.request),second.connectionId);
    finish();await acquiring;assert.equal(second.owned,true);
  }finally{finish();await first.release();await second.release();await third.release();}
});

test('handoff timeout removes only the requesting session locks, leaving the owner intact',async()=>{
  const f=fixture(),namespace=randomUUID();
  const first=f.lock({namespace,heartbeatMs:100000});const second=f.lock({namespace,waitMs:10});
  try{await first.acquire();await assert.rejects(second.acquire(),/timed out/);assert.equal(first.owned,true);
    assert.equal(f.owners.get(first.names.owner),first.connectionId);assert.equal(f.owners.has(first.names.request),false);
  }finally{await first.release();await second.release();}
});

test('ownership mismatch fails closed and never silently reconnects',async()=>{
  const f=fixture();let losses=0;const lock=f.lock({onLost:()=>losses++});
  await lock.acquire();f.owners.delete(lock.names.owner);
  await assert.rejects(lock.checkOwnership(),/ownership changed/);
  assert.equal(lock.owned,false);assert.equal(lock.closed,true);assert.equal(losses,1);
  assert.throws(()=>lock.assertOwned(),/not ready/);assert.equal(f.connections.length,1);
  lock.lose('another_error');assert.equal(losses,1);
});

test('connection failure signals loss while an intentional release does not',async()=>{
  const f=fixture();let losses=0;
  const one=f.lock({onLost:()=>losses++});await one.acquire();one.connection.emit('error',new Error('transport lost'));
  assert.equal(one.owned,false);assert.equal(losses,1);
  const two=f.lock({onLost:()=>losses++});await two.acquire();await two.release();assert.equal(losses,1);
});

test('cancellation closes a connection that arrives after shutdown',async()=>{
  const f=fixture();let complete;
  const connecting=new Promise(resolve=>{complete=resolve;});
  const lock=f.lock({connect:()=>connecting});const acquiring=lock.acquire();
  await lock.release();const connection=await f.connect();complete(connection);
  await assert.rejects(acquiring,/stopped/);
  assert.equal(connection.dead,true);assert.equal(lock.owned,false);assert.equal(f.owners.size,0);
});

test('a failed initial connection query closes its dedicated session',async()=>{
  const f=fixture();let connection;
  const connect=async()=>{connection=await f.connect();const query=connection.query;connection.query=options=>options.sql.includes('CONNECTION_ID')?Promise.reject(new Error('initial query failed')):query(options);return connection;};
  const lock=f.lock({connect});await assert.rejects(lock.acquire(),/initial query failed/);
  assert.equal(connection.dead,true);assert.equal(lock.closed,true);assert.equal(lock.owned,false);
});

test('transient startup connection failures retry without reviving an owned session',async()=>{
  const f=fixture();let attempts=0;const waiting=[];
  const lock=f.lock({connectRetryMs:1,onWaiting:entry=>waiting.push(entry),connect:async()=>{
    if(++attempts<3)throw Object.assign(new Error('private driver message'),{code:'ETIMEDOUT'});
    return f.connect();
  }});
  try{
    await lock.acquire();assert.equal(attempts,3);assert.equal(lock.owned,true);
    assert.deepEqual(waiting.map(entry=>entry.phase),['database_connection','database_connection']);
    lock.connection.emit('error',Object.assign(new Error('lost'),{code:'ECONNRESET'}));
    assert.equal(lock.owned,false);assert.equal(attempts,3,'Owned connections must never reconnect silently.');
  }finally{await lock.release();}
});

test('invalid credentials do not enter the transient startup retry loop',async()=>{
  const f=fixture();let attempts=0;
  const lock=f.lock({connect:async()=>{attempts++;throw Object.assign(new Error('private credentials'),{code:'ER_ACCESS_DENIED_ERROR'});}});
  await assert.rejects(lock.acquire(),error=>error.code==='ER_ACCESS_DENIED_ERROR');assert.equal(attempts,1);
  await lock.release();
});

test('dedicated ownership sessions set a bounded idle timeout before acquiring',async()=>{
  const f=fixture(),queries=[];
  const lock=f.lock({connect:async()=>{const connection=await f.connect(),query=connection.query;connection.query=options=>{queries.push(options.sql);return query(options);};return connection;}});
  try{
    await lock.acquire();assert.equal(queries[0],'SET SESSION wait_timeout = 60');
    assert.ok(queries.findIndex(sql=>sql.includes('GET_LOCK'))>0);
  }finally{await lock.release();}
});

test('a late GET_LOCK result cannot revive ownership after release',async()=>{
  const f=fixture();let finish,entered;
  const gate=new Promise(resolve=>{finish=resolve;});
  const queried=new Promise(resolve=>{entered=resolve;});
  const connect=async()=>{
    const connection=await f.connect(),query=connection.query;
    connection.query=async options=>{const result=await query(options);if(options.sql.includes('GET_LOCK')){entered();await gate;}return result;};
    return connection;
  };
  const lock=f.lock({connect});const acquiring=lock.acquire();
  await queried;await lock.release();finish();
  await assert.rejects(acquiring,/stopped/);
  assert.equal(lock.owned,false);assert.equal(lock.closed,true);assert.equal(f.owners.size,0);
});

test('drain rejects new operations but finishes nested accepted work before ownership release',async()=>{
  let finish,closed=0,scheduled=0;
  const gate=new Promise(resolve=>{finish=resolve;});
  class Service {
    async outer(){await gate;return this.inner();}
    async inner(){return 42;}
    scheduleAI(){scheduled++;}
    close(){closed++;}
  }
  const lock={owned:true,assertOwned(){if(!this.owned)throw new Error('not owned');}};
  const service=new Service(),lifecycle=manageArenaLifecycle(service,lock);
  const accepted=service.outer();await delay(1);
  const draining=lifecycle.drain();assert.equal(lifecycle.accepting,false);assert.equal(lifecycle.pending,1);
  await assert.rejects(service.inner(),/draining/);service.scheduleAI();assert.equal(scheduled,0);
  finish();assert.equal(await accepted,42);await draining;assert.equal(lifecycle.pending,0);assert.ok(closed>0);
  lock.owned=false;assert.throws(()=>service.inner(),/not owned/);
});

test('a timer inherited from completed initialization is tracked as a new operation',async()=>{
  let invoke,finish,entered;
  const gate=new Promise(resolve=>{finish=resolve;});const started=new Promise(resolve=>{entered=resolve;});
  class Service {
    async initialize(){setTimeout(()=>{invoke=this.pulse();},5);}
    async pulse(){entered();await gate;return 7;}
    scheduleAI(){}
    close(){}
  }
  const lock={owned:true,assertOwned(){assert.ok(this.owned);}};
  const service=new Service(),lifecycle=manageArenaLifecycle(service,lock);
  await service.initialize();await started;
  assert.equal(lifecycle.pending,1,'The inherited initialization context must be expired.');
  const draining=lifecycle.drain();finish();assert.equal(await invoke,7);await draining;assert.equal(lifecycle.pending,0);
});

test('a scheduled AI operation remains tracked independently of its active parent',async()=>{
  let finishParent,finishAI,entered;
  const parent=new Promise(resolve=>{finishParent=resolve;});const ai=new Promise(resolve=>{finishAI=resolve;});const started=new Promise(resolve=>{entered=resolve;});
  class Service {
    async outer(){this.scheduleAI();await parent;}
    scheduleAI(){setTimeout(()=>{void this.runAI();},5);}
    async runAI(){entered();await ai;}
    close(){}
  }
  const lock={owned:true,assertOwned(){assert.ok(this.owned);}};
  const service=new Service(),lifecycle=manageArenaLifecycle(service,lock);
  const accepted=service.outer();await started;assert.equal(lifecycle.pending,2);
  finishParent();await accepted;assert.equal(lifecycle.pending,1);
  let done=false;const draining=lifecycle.drain().then(()=>{done=true;});await delay(5);assert.equal(done,false);
  finishAI();await draining;assert.equal(lifecycle.pending,0);
});

const integrationUrl=process.env.COORDINATOR_TEST_DATABASE_URL;
test('real MySQL sessions enforce exclusion, handoff and normal-disconnect release',{skip:!integrationUrl,timeout:20000},async()=>{
  assert.match(new URL(integrationUrl).pathname,/^\/ea_(ci|test)_/,'Use an explicitly isolated CI/test database.');
  const namespace='integration-'+randomUUID();let requested=0;
  const first=new CoordinatorLock({databaseUrl:integrationUrl,namespace,heartbeatMs:50,onHandoff:async()=>{requested++;await delay(50);await first.release();}});
  const second=new CoordinatorLock({databaseUrl:integrationUrl,namespace,pollMs:20});
  try{
    await first.acquire();await second.acquire();assert.equal(requested,1);assert.equal(first.owned,false);
    assert.equal(second.owned,true);assert.notEqual(first.connectionId,second.connectionId);await second.checkOwnership();
    assert.equal(Number((await second.query('SELECT @@SESSION.wait_timeout AS seconds')).seconds),60);
    await second.release();let losses=0;
    const third=new CoordinatorLock({databaseUrl:integrationUrl,namespace,onLost:()=>losses++});
    try{
      await third.acquire();assert.equal(third.owned,true);
      third.connection.destroy();await assert.rejects(third.checkOwnership());
      assert.equal(third.owned,false);assert.equal(third.closed,true);assert.equal(losses,1);
      const fourth=new CoordinatorLock({databaseUrl:integrationUrl,namespace});
      try{await fourth.acquire();assert.equal(fourth.owned,true);}finally{await fourth.release();}
    }finally{await third.release();}
  }finally{await first.release();await second.release();}
});

test('an orphaned idle MySQL owner expires without killing or stealing another session',{skip:!integrationUrl,timeout:10000},async()=>{
  assert.match(new URL(integrationUrl).pathname,/^\/ea_(ci|test)_/);
  const namespace='idle-expiry-'+randomUUID();
  const first=new CoordinatorLock({databaseUrl:integrationUrl,namespace,heartbeatMs:100000});
  const second=new CoordinatorLock({databaseUrl:integrationUrl,namespace,pollMs:20,waitMs:4000});
  try{
    await first.acquire();
    // Simulate an abandoned coordinator session in this isolated namespace.
    // Production uses 60 seconds; one second keeps this real-server test fast.
    await first.query('SET SESSION wait_timeout = 1');
    await second.acquire();assert.equal(second.owned,true);assert.notEqual(first.connectionId,second.connectionId);
    assert.equal(first.owned,false);assert.equal(first.closed,true);
    await second.checkOwnership();
  }finally{await first.release();await second.release();}
});
