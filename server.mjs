import 'dotenv/config';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import next from 'next';
import {Server} from 'socket.io';
import {db} from './src/server/db.mjs';
import {ArenaService} from './src/server/arena.mjs';
import {allowedOrigins,secret} from './src/server/security.mjs';
import {requestClientIp} from './src/server/client-ip.mjs';
import {CoordinatorLock} from './src/server/coordinator-lock.mjs';
import {manageArenaLifecycle} from './src/server/coordinator-lifecycle.mjs';

const log=(event,extra={})=>console.log(JSON.stringify({level:'info',event,...extra,at:new Date().toISOString()}));
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===503?{'Retry-After':'2'}:{})});res.end(JSON.stringify(body));};
const unavailable={ok:false,error:{code:'SERVER_STARTING',message:'The arena is restarting. Please retry shortly.'}};

export async function startServer({bootstrap,exitOnShutdown=false}={}) {
  if (process.argv.includes('--production')) process.env.NODE_ENV='production';
  const dev=process.env.NODE_ENV!=='production';
  const port=Number(process.env.PORT||3000);
  const host=process.env.HOST||'0.0.0.0';
  secret();
  let ready=false,stopping=false,services,lifecycle,bootWork,shutdownWork;
  const app=next({dev,hostname:host,port});
  const handle=app.getRequestHandler();
  const lock=new CoordinatorLock({databaseUrl:process.env.DATABASE_URL,
    waitMs:120000,onHandoff:()=>shutdown('coordinator_handoff'),
    onLost:reason=>{
      // Never continue on the pooled Prisma connection after losing ownership.
      ready=false;stopping=true;lifecycle?.stop();delete globalThis.__elementalArena;
      io.disconnectSockets(true);server.close();server.closeAllConnections();
      log('coordinator_lost',{reason});
      if (exitOnShutdown) process.exit(1);
      else void db.$disconnect();
    },
  });
  const server=http.createServer(async(req,res)=>{
    req.headers['x-arena-ip']=requestClientIp(req);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    const pathname=new URL(req.url||'/',`http://localhost:${port}`).pathname;
    if (['/api/health','/api/ready'].includes(pathname)) {
      if (!ready || stopping || !lock.owned) return json(res,503,unavailable);
      try {await lock.checkOwnership();await db.$queryRaw`SELECT 1`;
        if (!ready || stopping) return json(res,503,unavailable);
        return json(res,200,{ok:true,database:'mysql',coordinator:'active',release:process.env.RAILWAY_GIT_COMMIT_SHA||process.env.RELEASE_SHA||null});
      }catch {return json(res,503,unavailable);}
    }
    if (pathname==='/health/live') return json(res,stopping?503:200,{ok:!stopping});
    if ((pathname==='/api'||pathname.startsWith('/api/')) && (!ready||stopping||!lock.owned)) return json(res,503,unavailable);
    try {await handle(req,res);}catch {if(!res.headersSent)json(res,500,{ok:false,error:{code:'INTERNAL',message:'The request could not be completed.'}});else res.destroy();}
  });
  const io=new Server(server,{cors:{origin:allowedOrigins(),credentials:true},maxHttpBufferSize:16384,pingInterval:20000,pingTimeout:20000,
    allowRequest:(req,callback)=>callback(null,Boolean(ready&&!stopping&&lock.owned&&req.headers.origin&&allowedOrigins().includes(req.headers.origin)))});
  io.use((socket,next)=>ready&&!stopping&&lock.owned?next():next(new Error('The arena is restarting. Please reconnect.')));
  io.on('connection',socket=>socket.use((packet,next)=>ready&&!stopping&&lock.owned?next():next(new Error('The coordinator is draining.'))));

  async function shutdown(reason='signal') {
    if (shutdownWork) return shutdownWork;
    stopping=true;ready=false;lifecycle?.stop();
    shutdownWork=(async()=>{
      log('arena_draining',{reason});
      const force=setTimeout(()=>{
        // Never voluntarily release ownership with unfinished writes. Exiting
        // closes every database session and rolls back open transactions.
        log('arena_drain_timeout');server.closeAllConnections();lock.lose('drain_timeout');
        if (exitOnShutdown) process.exit(1);
      },30000);
      force.unref();
      try {
        if (!lock.owned) await lock.release();
        if (bootWork) await bootWork.catch(()=>{});
        io.emit('server:restarting',{retryAfterMs:2000});io.disconnectSockets(true);
        // Accepted HTTP requests and outer service operations finish while
        // this process still owns the global lock.
        await Promise.all([
          new Promise(resolve=>server.close(()=>resolve())),
          new Promise(resolve=>io.close(()=>resolve())),
          lifecycle?.drain(),
        ]);
        // Already accepted routes may still format a committed operation via
        // arena().snapshot(). Admission is blocked above; retain their service
        // reference until their HTTP responses and tracked work have finished.
        delete globalThis.__elementalArena;
        await app.close();await db.$disconnect();await lock.release();
        log('arena_stopped',{reason});
        if (exitOnShutdown) process.exit(reason==='startup_failed'?1:0);
      }finally {clearTimeout(force);process.off('SIGTERM',onSignal);process.off('SIGINT',onSignal);}
    })();
    return shutdownWork;
  }
  const onSignal=()=>void shutdown('signal');
  process.on('SIGTERM',onSignal);process.on('SIGINT',onSignal);
  try {
    await app.prepare();
    if (stopping) throw new Error('Startup interrupted.');
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
    log('arena_waiting_for_ownership');await lock.acquire();
    if (stopping) throw new Error('Startup interrupted.');
    log('coordinator_acquired');
    // Migrations and catalog writes also execute under global ownership.
    bootWork=(async()=>{
      if (bootstrap) await bootstrap();
      await db.$connect();if (stopping) return;
      services=new ArenaService();lifecycle=manageArenaLifecycle(services,lock);
      await services.initialize();
    })();
    await bootWork;if (stopping) throw new Error('Startup interrupted.');
    services.attach(io);globalThis.__elementalArena=services;ready=true;
    log('arena_ready',{host,port,database:'mysql',rankedOpponents:'humans only'});
    return {server,io,services,lock,shutdown,get ready(){return ready&&!stopping&&lock.owned;}};
  } catch(error) {await shutdown('startup_failed');throw error;}
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  startServer({exitOnShutdown:true}).catch(()=>{log('arena_start_failed');process.exit(1);});
}
