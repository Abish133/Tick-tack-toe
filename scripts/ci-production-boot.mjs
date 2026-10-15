import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createConnection} from 'mysql2/promise';
import {PrismaClient} from '@prisma/client';
import {CoordinatorLock} from '../src/server/coordinator-lock.mjs';

// This script deliberately refuses local/live databases. GitHub's disposable
// Linux MySQL service is the only intended target; it starts with zero tables.
const databaseUrl=process.env.DATABASE_URL;
assert.equal(process.env.CI,'true','Production boot verification is restricted to disposable CI.');
assert.equal(process.platform,'linux','Fresh bootstrap must be tested on case-sensitive Linux.');
const target=new URL(databaseUrl);
assert.match(target.pathname,/^\/ea_ci_/,'An isolated ea_ci_ database is required.');
assert.ok(['localhost','127.0.0.1'].includes(target.hostname),'CI may only connect to its local MySQL service.');
const image=process.env.CI_IMAGE||'elemental-arena:ci';
const key=randomUUID().slice(0,8),first='ea-ci-first-'+key,second='ea-ci-second-'+key;
const firstOrigin='http://127.0.0.1:3911',secondOrigin='http://127.0.0.1:3912';
const env={...process.env,AUTH_SECRET:'isolated-ci-session-secret-32-characters-long',APP_ORIGIN:firstOrigin+','+secondOrigin};
const docker=(args)=>new Promise((resolve,reject)=>{
  const child=spawn('docker',args,{env,stdio:['ignore','pipe','pipe']});let output='',error='';
  child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);
  child.on('error',reject);child.on('exit',code=>code===0?resolve(output.trim()):reject(new Error(`Docker ${args[0]} failed: ${error.slice(-3000)}`)));
});
const start=(name,port,release)=>docker(['run','-d','--name',name,'--network','host','--env','DATABASE_URL','--env','AUTH_SECRET','--env','APP_ORIGIN','--env','NODE_ENV=production','--env','HOST=127.0.0.1','--env',`PORT=${port}`,'--env',`RELEASE_SHA=${release}`,image]);
async function poll(origin,pathname,expected,timeout=120000,{allowClosedListener=false}={}){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    try{const response=await fetch(origin+pathname,{signal:AbortSignal.timeout(2000)});if(response.status===expected)return response;}
    catch(error){if(allowClosedListener&&error.cause?.code==='ECONNREFUSED')return null;}
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${pathname} status ${expected}.`);
}
const db=new PrismaClient();
let sql,hold,userId,matchId;
try{
  sql=await createConnection(databaseUrl);
  const [setting]=await sql.query('SELECT @@lower_case_table_names AS caseMode');
  assert.equal(Number(setting[0].caseMode),0,'Case-sensitive MySQL is required to catch historical Windows migration errors.');
  const [tables]=await sql.query('SHOW TABLES');assert.equal(tables.length,0,'Boot verification requires a fresh, disposable database.');
  hold=new CoordinatorLock({databaseUrl,heartbeatMs:1000});await hold.acquire();
  await start(first,3911,'ci-first');
  await poll(firstOrigin,'/health/live',200);
  assert.equal((await fetch(firstOrigin+'/api/health')).status,503,'Standby must never advertise readiness.');
  const blocked=await fetch(firstOrigin+'/api/auth/guest',{method:'POST',headers:{origin:firstOrigin,'content-type':'application/json'},body:JSON.stringify({name:'Blocked CI'})});
  assert.equal(blocked.status,503,'API mutations must wait for global ownership.');
  const [stillEmpty]=await sql.query('SHOW TABLES');assert.equal(stillEmpty.length,0,'Migrations and seed must also wait for ownership.');
  await hold.release();
  const health=await (await poll(firstOrigin,'/api/health',200)).json();assert.equal(health.coordinator,'active');assert.equal(health.release,'ci-first');
  const [[{owner:firstOwner}]]=await sql.query('SELECT IS_USED_LOCK(?) AS owner',[hold.names.owner]);
  assert.ok(Number(firstOwner)>0,'The healthy first coordinator must own its dedicated MySQL lock.');
  const guest=await fetch(firstOrigin+'/api/auth/guest',{method:'POST',headers:{origin:firstOrigin,'content-type':'application/json'},body:JSON.stringify({name:'CI '+key})});
  assert.equal(guest.status,201);const cookie=guest.headers.get('set-cookie').split(';')[0];userId=(await guest.json()).user.id;
  // Hold this fixture player's occupancy row until a real request is waiting
  // to claim it. The takeover must drain that accepted request rather than
  // making a second coordinator ready while the first is still writing.
  await sql.beginTransaction();await sql.query('SELECT id FROM User WHERE id=? FOR UPDATE',[userId]);
  let matchResolved=false,earlyResponse;
  const creatingMatch=fetch(firstOrigin+'/api/matches',{method:'POST',headers:{origin:firstOrigin,'content-type':'application/json',cookie},body:JSON.stringify({mode:'ai',ruleset:'elemental',difficulty:'easy'})}).then(response=>{matchResolved=true;earlyResponse=response;return response;});
  const waitingDeadline=Date.now()+5000;let blockedTransaction=false;
  while(Date.now()<waitingDeadline){
    const [transactions]=await sql.query("SELECT trx_mysql_thread_id FROM information_schema.innodb_trx WHERE trx_state='LOCK WAIT'");
    if(transactions.length){blockedTransaction=true;break;}
    if(matchResolved)throw new Error(`The occupancy request finished before it blocked: status ${earlyResponse.status}, ${(await earlyResponse.text()).slice(0,1000)}`);
    // INNODB_TRX caches its snapshot until there has been more than 100ms
    // without a read. Faster polling continually extends that idle timer and
    // can freeze the first empty snapshot while the request is truly blocked.
    await delay(250);
  }
  assert.ok(blockedTransaction,'The accepted request must actually reach its SQL occupancy write.');
  assert.equal(matchResolved,false);
  await start(second,3912,'ci-second');
  await poll(secondOrigin,'/health/live',200,3000);
  // server.close() stops accepting new connections while existing requests
  // drain. A refused listener and an explicit 503 both mean it is unhealthy;
  // the SQL ownership and container checks below prove it has not exited.
  await poll(firstOrigin,'/health/live',503,2000,{allowClosedListener:true});
  assert.equal(matchResolved,false,'The accepted request must still be waiting for its fixture row lock during drain.');
  assert.equal((await fetch(secondOrigin+'/api/health')).status,503,'Replacement must wait until the accepted write drains.');
  const draining=JSON.parse(await docker(['inspect','--format','{{json .State}}',first]));assert.equal(draining.Running,true);
  const [[ownership]]=await sql.query('SELECT IS_USED_LOCK(?) AS owner, IS_USED_LOCK(?) AS requester',[hold.names.owner,hold.names.request]);
  assert.equal(Number(ownership.owner),Number(firstOwner),'The draining coordinator must retain ownership while an accepted write is pending.');
  assert.ok(Number(ownership.requester)>0&&Number(ownership.requester)!==Number(firstOwner),'The replacement must request handoff on a separate MySQL session.');
  await sql.commit();
  const match=await creatingMatch;assert.equal(match.status,201,'The accepted request must finish with its normal success response.');matchId=(await match.json()).matchId;
  const replacement=await (await poll(secondOrigin,'/api/health',200)).json();assert.equal(replacement.release,'ci-second');
  const old=JSON.parse(await docker(['inspect','--format','{{json .State}}',first]));assert.equal(old.Running,false,'Old coordinator must terminate before replacement readiness.');assert.equal(old.ExitCode,0,'A normal takeover should drain cleanly.');
  const session=await fetch(secondOrigin+'/api/auth/session',{headers:{cookie}});assert.equal(session.status,200);assert.equal((await session.json()).user.id,userId,'Persistent secret must preserve sessions across releases.');
  const active=await fetch(secondOrigin+'/api/matches/active',{headers:{cookie}});assert.equal(active.status,200);assert.equal((await active.json()).match.matchId,matchId,'Replacement must hydrate the active game before serving.');
  const [migrations]=await sql.query('SELECT migration_name,finished_at FROM _prisma_migrations WHERE rolled_back_at IS NULL');
  assert.ok(migrations.length>=3);assert.ok(migrations.every(row=>row.finished_at),'Every historical/new migration must finish on fresh Linux.');
  // Kill only this disposable CI coordinator's dedicated connection. The
  // supervisor must replace the worker without a container restart, keep
  // admission closed meanwhile, and hydrate the same durable match/session.
  const beforeRecovery=JSON.parse(await docker(['inspect','--format','{{json .State}}',second]));
  const [[{owner:lostOwner}]]=await sql.query('SELECT IS_USED_LOCK(?) AS owner',[hold.names.owner]);
  assert.ok(Number.isSafeInteger(Number(lostOwner))&&Number(lostOwner)>0);
  await sql.query('KILL CONNECTION '+Number(lostOwner));
  await poll(secondOrigin,'/api/health',503,5000,{allowClosedListener:true});
  const recovered=await (await poll(secondOrigin,'/api/health',200,60000)).json();assert.equal(recovered.release,'ci-second');
  const afterRecovery=JSON.parse(await docker(['inspect','--format','{{json .State}}',second]));
  assert.equal(afterRecovery.Running,true);assert.equal(afterRecovery.Pid,beforeRecovery.Pid,'Recovery must retain the supervisor container process.');
  const [[{owner:recoveredOwner}]]=await sql.query('SELECT IS_USED_LOCK(?) AS owner',[hold.names.owner]);
  assert.ok(Number(recoveredOwner)>0);assert.notEqual(Number(recoveredOwner),Number(lostOwner),'Recovery must use a new dedicated owner session.');
  const recoveredSession=await fetch(secondOrigin+'/api/auth/session',{headers:{cookie}});assert.equal(recoveredSession.status,200);assert.equal((await recoveredSession.json()).user.id,userId);
  const recoveredMatch=await fetch(secondOrigin+'/api/matches/active',{headers:{cookie}});assert.equal(recoveredMatch.status,200);assert.equal((await recoveredMatch.json()).match.matchId,matchId);
  console.log('Production Linux bootstrap, ownership gate, session continuity, rolling takeover and database interruption recovery passed.');
}catch(error){
  for(const name of[first,second]){try{console.error((await docker(['logs','--tail','60',name])).slice(-5000));}catch{}}
  throw error;
}finally{
  // Release only the fixture row lock before stopping our own containers.
  try{await sql?.rollback();}catch{}
  await hold?.release();
  for(const name of[first,second]){try{await docker(['stop','--time','45',name]);}catch{}try{await docker(['rm','-f',name]);}catch{}}
  if(matchId)await db.match.deleteMany({where:{id:matchId}});
  if(userId){await db.auditLog.deleteMany({where:{userId}});await db.user.deleteMany({where:{id:userId}});}
  await db.$disconnect();await sql?.end();
}
