import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {test,expect} from '@playwright/test';

const configuredBase=process.env.E2E_BASE_URL||'http://localhost:3000';
const localTarget=['localhost','127.0.0.1','[::1]'].includes(new URL(configuredBase).hostname);
const fixtureAllowed=localTarget&&Boolean(process.env.DATABASE_URL)&&!['false','0'].includes(String(process.env.E2E_ALLOW_DB_FIXTURES||'').toLowerCase());
function remember(user){const file=path.resolve('.runtime/e2e-test-users.json');fs.mkdirSync(path.dirname(file),{recursive:true});const ids=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];if(!ids.includes(user.id))fs.writeFileSync(file,JSON.stringify([...ids,user.id]));}
async function read(page,route){return page.evaluate(async route=>{const response=await fetch(route,{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error?.message||`HTTP ${response.status}`);return body;},route);}

test('earned-coin premium journey unlocks, claims once and equips its actual exclusive frame',async({page})=>{
 test.skip(!fixtureAllowed,'Local fixture test only; E2E_ALLOW_DB_FIXTURES=false disables all coin and XP fixture writes.');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const tag=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
 await page.goto('/');await page.getByRole('button',{name:'Player account',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Play as guest',exact:true}).click();
 await dialog.getByLabel('Player name',{exact:true}).fill(`E2E Pass ${tag}`.slice(0,20));await dialog.getByRole('button',{name:'Enter as a guest'}).click();await expect(dialog).toBeHidden();
 const user=(await read(page,'/api/auth/session')).user;expect(user?.id).toBeTruthy();remember(user);
 const {PrismaClient}=await import('@prisma/client'),db=new PrismaClient();
 let season;
 try{
  season=await db.season.findFirst({where:{active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}},orderBy:{startsAt:'desc'}});expect(season).toBeTruthy();
  await db.currencyWallet.update({where:{userId:user.id},data:{coins:900}});
  await db.seasonParticipation.upsert({where:{seasonId_userId:{seasonId:season.id,userId:user.id}},create:{seasonId:season.id,userId:user.id,xp:100},update:{xp:100}});
 }finally{await db.$disconnect();}
 await page.goto('/season-pass');
 const pass=page.getByRole('region',{name:'Premium cosmetic season pass'});
 await pass.getByRole('button',{name:'Unlock for 900 coins',exact:true}).click();
 await expect(pass).toContainText('Owned for this season');
 expect((await read(page,'/api/auth/session')).user.coins).toBe(0);
 await page.getByRole('button',{name:/^Premium journey/}).click();
 const reward=page.locator('.season-tier').filter({has:page.getByRole('heading',{name:'Eclipse Halo',exact:true})});
 await reward.getByRole('button',{name:'Claim reward',exact:true}).click();
 await expect(reward.getByRole('button',{name:'Claimed',exact:true})).toBeDisabled();
 expect((await read(page,'/api/auth/session')).user.coins).toBe(25);
 const duplicate=await page.evaluate(async()=>{const response=await fetch('/api/season-pass/claim',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({level:1,track:'premium'})});return {status:response.status,body:await response.json()};});
 expect(duplicate.status).toBe(409);expect((await read(page,'/api/auth/session')).user.coins).toBe(25);
 const free=(await read(page,'/api/season-pass')).tiers[0];expect(free.claimed).toBe(false);
 await page.goto('/inventory');
 const item=page.locator('.shop-card').filter({has:page.getByRole('heading',{name:'Eclipse Halo',exact:true})});
 await item.getByRole('button',{name:'Equip cosmetic',exact:true}).click();await expect(item.getByRole('button',{name:'Equipped',exact:true})).toBeDisabled();
 await expect(page.locator('.app-shell')).toHaveClass(/frame-eclipse/);
 await expect(page.locator('.top-avatar .avatar')).toHaveCSS('border-top-color','rgb(213, 181, 242)');
 expect((await read(page,'/api/auth/session')).user.profile.equippedFrame).toBe('frame-eclipse');
 await page.goto('/profile');await expect(page.locator('[class*="portrait"].frame-eclipse')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.goto('/season-pass');await page.getByRole('button',{name:/^Premium journey/}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
});
