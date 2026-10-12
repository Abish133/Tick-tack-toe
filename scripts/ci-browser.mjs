import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const url=new URL(process.env.DATABASE_URL);
if(!/^\/ea_ci_/.test(url.pathname))throw new Error('Browser CI requires an isolated ea_ci_ database.');
const base='http://localhost:3000';
const server=spawn(process.execPath,['server.mjs','--production'],{stdio:'inherit',env:{...process.env,PORT:'3000',HOST:'0.0.0.0',APP_ORIGIN:base}});
let stopped=false;const exited=new Promise(resolve=>server.once('exit',code=>{stopped=true;resolve(code);}));
function run(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,E2E_BASE_URL:base,E2E_ALLOW_DB_FIXTURES:'true'}});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Browser command failed with exit '+code)));});}
try{
 let ready=false;
 for(let attempt=0;attempt<90&&!stopped;attempt++){try{const response=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}}catch{}await delay(500);}
 if(!ready)throw new Error('Browser CI server failed readiness.');
 await run(['node_modules/@playwright/test/cli.js','test']);
}finally{
 if(!stopped)server.kill('SIGTERM');
 await Promise.race([exited,delay(35000,undefined,{ref:false}).then(()=>{if(!stopped)server.kill('SIGKILL');})]);
 await run(['scripts/cleanup-e2e.mjs']);
}
