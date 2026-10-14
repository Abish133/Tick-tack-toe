import {test,expect} from '@playwright/test';

test('phone and tablet header keeps controls, rank and balances aligned without wrapping or false rewards',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/auth/session',route=>route.fulfill({json:{user:{id:'header-layout-preview',name:'Header Preview',guest:true,role:'PLAYER',cups:1900,coins:2147483647,level:12345,loadout:['fire','shield','portal'],profile:{avatar:'avatar-void'},settings:{sound:true,reducedMotion:true}},features:{}}}));
 await page.goto('/local-play');const hud=page.getByRole('banner',{name:'Player HUD',exact:true});
 await expect(hud.getByRole('button',{name:/Grandmaster rank, level 12345/})).toBeVisible();
 for(const width of [320,360,390,412,600,760,820,1024,1440]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const buttons=hud.getByRole('button');
  const boxes=await buttons.evaluateAll(elements=>elements.filter(el=>el.getBoundingClientRect().width&&getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label'),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));
  for(const box of boxes){expect(box.x,`${width}px ${box.name} left`).toBeGreaterThanOrEqual(0);expect(box.right,`${width}px ${box.name} right`).toBeLessThanOrEqual(width);expect(box.height,`${width}px ${box.name} touch height`).toBeGreaterThanOrEqual(40);}
  const logo=boxes.find(b=>b.name==='Elemental Arena home'),settings=boxes.find(b=>b.name==='Settings'),account=boxes.find(b=>b.name==='Player account'),rank=boxes.find(b=>b.name?.startsWith('Grandmaster rank')),cups=boxes.find(b=>b.name?.startsWith('Trophies:')),coins=boxes.find(b=>b.name?.startsWith('Cosmetic coins:'));
  if(width<=760){expect(Math.abs(logo.y-settings.y)).toBeLessThanOrEqual(2);expect(Math.abs(settings.y-account.y)).toBeLessThanOrEqual(2);expect(rank.y).toBeGreaterThanOrEqual(logo.bottom+4);expect(Math.abs(rank.y-cups.y)).toBeLessThanOrEqual(2);expect(Math.abs(cups.y-coins.y)).toBeLessThanOrEqual(2);expect(rank.right).toBeLessThanOrEqual(cups.x);expect(cups.right).toBeLessThanOrEqual(coins.x);}
 }
 await expect(hud.getByRole('button',{name:/Cosmetic coins:/})).toHaveAttribute('title',/2,147,483,647/);
 await expect(hud.locator('i[aria-hidden="true"]')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await hud.getByRole('button',{name:'Settings',exact:true}).click();await expect(page).toHaveURL(/\/settings$/);
 await page.getByRole('button',{name:'Journey',exact:true}).click();await expect(page.getByRole('dialog',{name:'Your arena journey'}).getByRole('button',{name:'Notifications',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
