import 'dotenv/config';
import {superviseRuntime} from './runtime-supervisor.mjs';
import {runtimeErrorDetails,transientRuntimeError,TRANSIENT_RUNTIME_EXIT} from '../src/server/runtime-errors.mjs';

if(process.argv.includes('--worker')) {
  const {startServer}=await import('../server.mjs');
  const {bootstrapDatabase}=await import('./production-bootstrap.mjs');
  startServer({bootstrap:bootstrapDatabase,exitOnShutdown:true}).catch(error=>{
    console.error(JSON.stringify({level:'error',event:'container_start_failed',...runtimeErrorDetails(error)}));
    process.exit(transientRuntimeError(error)?TRANSIENT_RUNTIME_EXIT:1);
  });
}else{
  process.exitCode=await superviseRuntime({args:[process.argv[1],'--worker']});
}
