import 'dotenv/config';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {db} from './db.mjs';
import {createPlayer} from './players.mjs';
// Local operator command only. Public registration can never assign a privileged role.
const rl=createInterface({input:stdin,output:stdout});
try{
  const email=(process.env.ADMIN_EMAIL||await rl.question('Admin email: ')).trim().toLowerCase();
  let user=await db.user.findUnique({where:{email}});
  if(!user){const password=process.env.ADMIN_PASSWORD||await rl.question('Initial admin password (10+ characters, input visible in this local terminal): ');user=await createPlayer({email,password,name:'Arena Admin'});}
  await db.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  await db.auditLog.create({data:{userId:user.id,action:'local_admin_provisioned',details:{method:'local operator CLI'}}});
  console.log(`Administrator role assigned to ${email}. Sign in through the normal login screen.`);
}finally{rl.close();await db.$disconnect();}
