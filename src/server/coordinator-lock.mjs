import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {transientRuntimeError} from './runtime-errors.mjs';

export function coordinatorLockNames(databaseUrl, namespace = '') {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:' || !url.pathname.slice(1)) throw new Error('A MySQL database URL is required for coordinator ownership.');
  // MySQL advisory locks are server-wide. Do not include credentials or hostnames:
  // a private hostname and a public proxy can address the same database server.
  // Fold case conservatively: lower_case_table_names=1 can address one
  // database with differently cased URLs. On a case-sensitive server this
  // can only serialize two distinct case variants; it cannot create two owners.
  const database = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  const key = createHash('sha256').update(`${database}\0${namespace}`).digest('hex').slice(0,32);
  return {owner:`ea:${key}:owner`,request:`ea:${key}:handoff`};
}

export async function dedicatedMySQLConnection(databaseUrl) {
  const {createConnection} = await import('mysql2/promise');
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslaccept');
  if (sslMode === 'accept_invalid_certs') throw new Error('Coordinator connections require verified TLS when TLS is configured.');
  // This connection is deliberately never pooled and never automatically reconnected.
  return createConnection({host:url.hostname,port:Number(url.port||3306),
    user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),
    database:decodeURIComponent(url.pathname.slice(1)),connectTimeout:10000,
    enableKeepAlive:true,keepAliveInitialDelay:1000,
    ...(sslMode ? {ssl:{rejectUnauthorized:true}} : {})});
}

export class CoordinatorLock {
  constructor({databaseUrl,namespace='',connect=dedicatedMySQLConnection,onLost=()=>{},onHandoff=()=>{},
    waitMs=120000,pollMs=250,heartbeatMs=500,queryTimeoutMs=3000,connectRetryMs=2000,onWaiting=()=>{}}={}) {
    this.databaseUrl=databaseUrl;
    this.names=coordinatorLockNames(databaseUrl,namespace);
    this.connect=connect;this.onLost=onLost;this.onHandoff=onHandoff;
    this.waitMs=waitMs;this.pollMs=pollMs;this.heartbeatMs=heartbeatMs;this.queryTimeoutMs=queryTimeoutMs;
    this.connection=null;this.owned=false;this.closed=false;this.requested=false;
    this.connectionId=null;this.timer=null;this.checking=false;this.handoffStarted=false;
    this.onWaiting=onWaiting;
    this.connectRetryMs=connectRetryMs;
  }
  async query(sql,values=[]) {
    const [rows]=await this.connection.query({sql,values,timeout:this.queryTimeoutMs});
    return rows[0];
  }
  async acquire() {
    if (this.connection || this.closed) throw new Error('Coordinator lock instances are single-use.');
    const deadline=Date.now()+this.waitMs;
    let connection;
    // Retry opening a new, unowned session only. An owned connection is never
    // replaced inside this lock; ownership loss still stops the whole worker.
    for(let attempt=1;!connection;attempt++){
      try{connection=await this.connect(this.databaseUrl);}
      catch(error){
        if(this.closed||!transientRuntimeError(error)||Date.now()>=deadline)throw error;
        this.onWaiting({phase:'database_connection',attempt,error});
        await delay(Math.min(this.connectRetryMs,Math.max(1,deadline-Date.now())));
      }
      if(this.closed&&!connection)throw new Error('Coordinator acquisition was stopped.');
    }
    if (this.closed) {
      // A signal can arrive while connect() is still resolving. A late
      // connection must not survive the cancelled acquisition.
      connection.destroy?.();
      throw new Error('Coordinator acquisition was stopped.');
    }
    this.connection=connection;
    this.connection.on?.('error',error=>this.lose('database_connection_lost',error));
    this.connection.on?.('end',()=>this.lose('database_connection_ended'));
    try {
      // Heartbeats run every 500ms. Bound the server-side idle life so a lost
      // TCP session cannot retain ownership for MySQL's default eight hours.
      // A replacement still has to acquire GET_LOCK; it never steals a lock.
      await this.query('SET SESSION wait_timeout = 60');
      const {id}=await this.query('SELECT CONNECTION_ID() AS id');
      this.connectionId=Number(id);
      let lastWaitLog=0;
      while (!this.closed) {
        const {acquired}=await this.query('SELECT GET_LOCK(?, 0) AS acquired',[this.names.owner]);
        if (this.closed) throw new Error('Coordinator acquisition was stopped.');
        if (Number(acquired)===1) {
          this.owned=true;
          if (this.requested) {
            await this.query('SELECT RELEASE_LOCK(?) AS released',[this.names.request]);
            this.requested=false;
          }
          await this.checkOwnership();
          this.startHeartbeat();
          return this;
        }
        if (acquired===null) throw new Error('MySQL refused coordinator ownership.');
        if(Date.now()-lastWaitLog>=10000){
          const {owner}=await this.query('SELECT IS_USED_LOCK(?) AS owner',[this.names.owner]);
          this.onWaiting({phase:'coordinator_ownership',ownerConnectionId:Number(owner)||null,connectionId:this.connectionId});
          lastWaitLog=Date.now();
        }
        if (!this.requested) {
          const {acquired:request}=await this.query('SELECT GET_LOCK(?, 0) AS acquired',[this.names.request]);
          if (this.closed) throw new Error('Coordinator acquisition was stopped.');
          // A third deployment must not queue behind an in-progress handoff:
          // serial release workflows/one replica are required.
          if (Number(request)!==1) throw new Error('Another coordinator takeover is already in progress.');
          this.requested=true;
        }
        if (Date.now()>=deadline) throw Object.assign(new Error('Coordinator ownership timed out; the existing server was not replaced.'),{code:'COORDINATOR_WAIT_TIMEOUT'});
        await delay(this.pollMs);
      }
      throw new Error('Coordinator acquisition was stopped.');
    } catch (error) { await this.release();throw error; }
  }
  assertOwned() {
    if (!this.owned || this.closed) throw Object.assign(new Error('The game coordinator is not ready.'),{code:'COORDINATOR_UNAVAILABLE',status:503});
  }
  async checkOwnership() {
    this.assertOwned();
    try {
      const row=await this.query('SELECT IS_USED_LOCK(?) AS owner, CONNECTION_ID() AS id, IS_USED_LOCK(?) AS requester',[this.names.owner,this.names.request]);
      if (Number(row.owner)!==this.connectionId || Number(row.id)!==this.connectionId) throw new Error('Coordinator ownership changed.');
      if (row.requester!==null && Number(row.requester)!==this.connectionId && !this.handoffStarted) {
        this.handoffStarted=true;
        // Do not await draining on this connection's heartbeat queue.
        Promise.resolve().then(()=>this.onHandoff()).catch(()=>this.lose('handoff_failed'));
      }
      return true;
    } catch (error) {this.lose('ownership_check_failed',error);throw error;}
  }
  startHeartbeat() {
    this.timer=setInterval(async()=>{
      if (this.checking || this.closed) return;
      this.checking=true;
      try {await this.checkOwnership();}catch {}finally {this.checking=false;}
    },this.heartbeatMs);
    this.timer.unref?.();
  }
  lose(reason,error) {
    if (this.closed) return;
    const hadOwnership=this.owned;
    this.closed=true;this.owned=false;clearInterval(this.timer);
    this.connection?.destroy?.();
    if (hadOwnership) this.onLost(reason,error);
  }
  async release() {
    if (this.closed) return;
    // Mark closed before closing the connection so its normal end event cannot
    // be mistaken for an ownership-loss fault.
    this.closed=true;this.owned=false;clearInterval(this.timer);
    if (!this.connection) return;
    try {
      if (this.requested) await this.query('SELECT RELEASE_LOCK(?) AS released',[this.names.request]);
      await this.query('SELECT RELEASE_LOCK(?) AS released',[this.names.owner]);
      await this.connection.end();
    } catch {this.connection.destroy?.();}
  }
}
