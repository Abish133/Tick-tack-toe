import 'dotenv/config';
import {startServer} from '../server.mjs';
import {bootstrapDatabase} from './production-bootstrap.mjs';

// One Node process receives container signals and holds its dedicated MySQL
// session across migrations, seeding, serving and draining.
startServer({bootstrap:bootstrapDatabase,exitOnShutdown:true}).catch(()=>{
  console.error(JSON.stringify({level:'error',event:'container_start_failed'}));
  process.exit(1);
});
