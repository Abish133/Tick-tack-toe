import 'dotenv/config';
import http from 'node:http';
import next from 'next';
import {Server} from 'socket.io';
import {db} from './src/server/db.mjs';
import {ArenaService} from './src/server/arena.mjs';
import {allowedOrigins,secret} from './src/server/security.mjs';
import {requestClientIp} from './src/server/client-ip.mjs';

if(process.argv.includes('--production'))process.env.NODE_ENV='production';
const dev=process.env.NODE_ENV!=='production';
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'0.0.0.0';
secret();
await db.$connect();
const app=next({dev,hostname:host,port});
await app.prepare();
const handle=app.getRequestHandler();
const server=http.createServer((req,res)=>{
  // The header is overwritten locally so a browser cannot spoof API rate-limit identity.
  req.headers['x-arena-ip']=requestClientIp(req);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  handle(req,res);
});
const io=new Server(server,{cors:{origin:allowedOrigins(),credentials:true},maxHttpBufferSize:16384,pingInterval:20000,pingTimeout:20000,allowRequest:(req,callback)=>callback(null,Boolean(req.headers.origin&&allowedOrigins().includes(req.headers.origin)))});
const services=await new ArenaService().initialize();
globalThis.__elementalArena=services;
services.attach(io);
server.listen(port,host,()=>console.log(JSON.stringify({level:'info',event:'arena_ready',url:`http://localhost:${port}`,host,database:'mysql',rankedOpponents:'humans only',at:new Date().toISOString()})));
async function shutdown(){services.close();io.close();server.close();await db.$disconnect();process.exit(0);}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
