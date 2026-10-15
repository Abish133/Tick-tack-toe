import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {TRANSIENT_RUNTIME_EXIT} from '../src/server/runtime-errors.mjs';

// A database interruption must close every worker connection before it can
// recover. The small parent stays alive so Railway's finite restart allowance
// is not exhausted while MySQL or its private network recovers.
export async function superviseRuntime({command=process.execPath,args,spawnWorker=spawn,
  signals=process,log=entry=>console.log(JSON.stringify({...entry,at:new Date().toISOString()})),
  sleep=delay,baseDelayMs=2000,maxDelayMs=30000,stableMs=60000,stopTimeoutMs=35000}={}) {
  let child,stopping=false,signal,force,wakeDelay,failures=0;
  const stop=received=>{
    if(stopping)return;
    stopping=true;signal=received;
    wakeDelay?.abort();
    if(child){child.kill(received);force=setTimeout(()=>child?.kill('SIGKILL'),stopTimeoutMs);force.unref?.();}
  };
  const term=()=>stop('SIGTERM'),interrupt=()=>stop('SIGINT');
  signals.on('SIGTERM',term);signals.on('SIGINT',interrupt);
  try {
    while(!stopping){
      const started=Date.now();
      const result=await new Promise(resolve=>{
        child=spawnWorker(command,args,{stdio:'inherit',env:process.env});
        child.once('error',()=>resolve({code:1,signal:null}));
        child.once('exit',(code,exitSignal)=>resolve({code,signal:exitSignal}));
      });
      child=null;clearTimeout(force);
      if(stopping)return result.code===0?0:signal==='SIGINT'?130:143;
      if(result.code!==TRANSIENT_RUNTIME_EXIT)return Number.isInteger(result.code)?result.code:1;
      failures=Date.now()-started>=stableMs?1:failures+1;
      const retryAfterMs=Math.min(maxDelayMs,baseDelayMs*2**Math.min(failures-1,10));
      log({level:'warn',event:'arena_recovery_retry',retryAfterMs,attempt:failures});
      wakeDelay=new AbortController();
      try{await sleep(retryAfterMs,undefined,{signal:wakeDelay.signal});}
      catch(error){if(error.name!=='AbortError')throw error;}
      finally{wakeDelay=null;}
    }
    return signal==='SIGINT'?130:143;
  }finally{
    clearTimeout(force);signals.off('SIGTERM',term);signals.off('SIGINT',interrupt);
  }
}
