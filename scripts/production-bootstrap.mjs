import {PrismaClient} from '@prisma/client';
import {run,root,sleep} from './local-utils.mjs';
import {deployMigrationsWithCaseCompatibility} from './migration-case-compat.mjs';

export async function bootstrapDatabase() {
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must point to the dedicated MySQL database.');
  const authSecret=process.env.SESSION_SECRET||process.env.AUTH_SECRET;
  if(!authSecret||authSecret.length<32)throw new Error('Set a persistent authentication secret containing at least 32 characters.');
  if(!process.env.APP_ORIGIN)throw new Error('Set APP_ORIGIN to the exact browser origin before starting the container.');
  for(const origin of process.env.APP_ORIGIN.split(',').map(value=>value.trim())){
    let url;try{url=new URL(origin);}catch{throw new Error('APP_ORIGIN must contain exact HTTP or HTTPS origins.');}
    if(!['http:','https:'].includes(url.protocol)||url.origin!==origin)throw new Error('APP_ORIGIN must contain exact origins without a trailing slash or path.');
  }
  const db=new PrismaClient();
  const configuredTimeout=Number(process.env.DB_READY_TIMEOUT_MS||120000);
  const deadline=Date.now()+(Number.isFinite(configuredTimeout)?Math.min(300000,Math.max(1000,configuredTimeout)):120000);
  try{
    while(true){
      try{await db.$queryRaw`SELECT 1`;break;}
      catch{
        if(Date.now()>=deadline)throw new Error('Database readiness timed out.');
        console.log(JSON.stringify({level:'info',event:'waiting_for_database'}));
        await sleep(2000);
      }
    }
    await deployMigrationsWithCaseCompatibility({db,root,
      deploy:()=>run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit'}),
      resolve:name=>run(process.execPath,['node_modules/prisma/build/index.js','migrate','resolve','--applied',name],{stdio:'inherit'}),
    });
  }finally{await db.$disconnect();}
  await run(process.execPath,['prisma/seed.mjs'],{stdio:'inherit'});
}
