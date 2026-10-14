import 'dotenv/config';
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {scoresForBoard} from '../src/lib/game-engine/geometry.js';

async function read(page,route){return page.evaluate(async route=>{const response=await fetch(route,{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error?.message||String(response.status));return body;},route);}
async function guest(page,suffix){
 await page.goto('/');await page.getByRole('button',{name:'Enter the arena',exact:true}).click();
 await page.getByRole('button',{name:'Player account',exact:true}).click();const auth=page.getByRole('dialog');
 await auth.getByLabel('Player name',{exact:true}).fill(`E2E ${suffix} ${Date.now().toString(36)}`.slice(0,20));
 await auth.getByRole('button',{name:'Enter as a guest',exact:true}).click();await expect(auth).toBeHidden();
 await expect(page.locator('.connection')).toHaveText('Arena connected');const user=(await read(page,'/api/auth/session')).user;
 const file=path.resolve('.runtime/e2e-test-users.json');fs.mkdirSync(path.dirname(file),{recursive:true});const ids=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];if(!ids.includes(user.id))fs.writeFileSync(file,JSON.stringify([...ids,user.id]));return user;
}
async function finish(page,id){if(!id)return;try{await page.evaluate(async id=>{await fetch(`/api/matches/${id}/surrender`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID()})});},id);}catch{}}
test.beforeEach(async({},info)=>{info.setTimeout(180000);await new Promise(resolve=>setTimeout(resolve,60000));});

test('4 by 4 private Classic continues after a line, scores a full board, reconnects and replays',async({browser})=>{
 const contexts=await Promise.all([browser.newContext({baseURL:process.env.E2E_BASE_URL||'http://localhost:3000',reducedMotion:'reduce'}),browser.newContext({baseURL:process.env.E2E_BASE_URL||'http://localhost:3000',reducedMotion:'reduce'})]);
 const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));let matchId;
 try{
  await guest(a,'Grid A');await guest(b,'Grid B');
  await a.getByRole('button',{name:'Challenge a Friend',exact:false}).click();
  const room=a.getByRole('dialog',{name:'A friendly rivalry'});await room.getByRole('button',{name:'4 by 4 board',exact:true}).click();await room.getByRole('button',{name:'Classic',exact:true}).click();await room.getByRole('button',{name:'Create a room',exact:true}).click();
  const code=await a.locator('.room-code').innerText();await b.getByRole('button',{name:'Challenge a Friend',exact:false}).click();
  const join=b.getByRole('dialog',{name:'A friendly rivalry'});await join.getByRole('textbox',{name:'Room code',exact:true}).fill(code);await join.getByRole('button',{name:'Join room',exact:true}).click();
  for(const p of [a,b])await expect(p.getByRole('group',{name:'4 by 4 classic game board',exact:true}).getByRole('button')).toHaveCount(16);
  const initial=(await read(a,'/api/matches/active')).match;matchId=initial.matchId;expect(initial.state.maxRounds).toBe(1);expect(initial.boardSize).toBe(4);
  const x=initial.you===initial.state.players[0].id?a:b,o=x===a?b:a;
  const order=[0,4,1,5,2,6,3,7,8,11,9,12,10,13,15,14];
  for(let i=0;i<order.length;i++){
   const actor=i%2===0?x:o;const cell=actor.getByRole('group',{name:'4 by 4 classic game board',exact:true}).getByRole('button').nth(order[i]);await expect(cell).toBeEnabled();await cell.click();
   for(const p of [a,b])await expect.poll(async()=>(await read(p,`/api/matches/${matchId}`)).state.revision).toBe(i+1);
   if(i===4){const live=await read(a,`/api/matches/${matchId}`);expect(live.state.status).toBe('active');expect(live.state.roundScores[initial.state.players[0].id]).toBe(1);await b.reload();await expect(b.locator('.connection')).toHaveText('Arena connected');}
  }
  const done=await read(a,`/api/matches/${matchId}`);expect(done.state.status).toBe('finished');expect(done.state.board.every(Boolean)).toBe(true);expect(done.state.roundScores).toEqual(scoresForBoard(done.state.board,done.state.players.map(p=>p.id),4));
  for(const p of [a,b]){await expect(p.locator('.result-panel')).toBeVisible();await expect(p.getByLabel('Final three-in-a-row scores',{exact:true})).toBeVisible();}
  await a.getByRole('button',{name:'View replay',exact:true}).click();await expect(a.locator('.replay-panel .game-cell')).toHaveCount(16);for(let step=0;step<16;step++)await a.getByRole('button',{name:'Next action',exact:true}).click();await expect(a.locator('.replay-caption')).toContainText('Action 16 of 16');await expect(a.getByLabel('Replay three-in-a-row score',{exact:true})).toBeVisible();
 }finally{await finish(a,matchId);await Promise.all(contexts.map(c=>c.close()));}
});

test('Ranked clearly discloses and starts a Hard competitive bot on a 6 by 6 board',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let matchId;
 try{
  await guest(page,'Rank Bot');await page.getByRole('button',{name:'6 by 6 board',exact:true}).click();await page.getByRole('button',{name:'Play Ranked',exact:true}).click();
  const queue=page.getByRole('dialog',{name:'Finding your next rival',exact:true});await expect(queue).toContainText("If no real world players are found you'll play against a competitive bot");
  await expect(page.getByRole('group',{name:'6 by 6 elemental game board',exact:true})).toBeVisible({timeout:40000});
  const active=(await read(page,'/api/matches/active')).match;matchId=active.matchId;expect(active.mode).toBe('ranked');expect(active.boardSize).toBe(6);expect(active.rankedBot.difficulty).toBe('hard');expect(active.difficulty).toBe('hard');
  const bot=active.participants.find(p=>p.isAI);expect(bot.type).toBe('competitive-bot');expect(bot.userId).toBeNull();await expect(page.locator('.battle-player.opponent')).toContainText('Competitive bot');
  const target=page.getByRole('group',{name:'6 by 6 elemental game board',exact:true}).getByRole('button').nth(35);await expect(target).toBeEnabled();await target.click();await expect.poll(async()=>(await read(page,`/api/matches/${matchId}`)).state.revision).toBeGreaterThanOrEqual(2);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.battle-controls').getByRole('button',{name:'Surrender',exact:true}).click();await page.getByRole('dialog',{name:'Leave this battle?'}).getByRole('button',{name:'Surrender',exact:true}).click();await expect(page.locator('.result-panel')).toBeVisible();
  await expect(page.locator('.result-panel')).toContainText('hard competitive bot');const done=await read(page,`/api/matches/${matchId}`);expect(done.settlement.settled).toBe(true);const human=done.participants.find(p=>!p.isAI);expect(human.outcome).toBe('loss');expect(human.cupChange).toBe(Math.max(-human.initialCups,-20)||0);expect(errors).toEqual([]);
 }finally{await finish(page,matchId);}
});
