import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {test, expect} from '@playwright/test';
import {COLLECTION_COSMETICS, cosmeticMotion} from '../src/lib/cosmetic-collection.js';

const target=new URL(process.env.E2E_BASE_URL||'http://localhost:3000');
const database=process.env.DATABASE_URL?new URL(process.env.DATABASE_URL):null;
const fixtureAllowed=['localhost','127.0.0.1','[::1]'].includes(target.hostname)
  && database && /^ea_(?:test|ci)_/.test(database.pathname.slice(1))
  && !['false','0'].includes(String(process.env.E2E_ALLOW_DB_FIXTURES||'').toLowerCase());
const items=COLLECTION_COSMETICS.filter(item=>item.rarity==='ascendant');
const fields={avatar:'avatar',board:'equippedBoard',marks:'equippedMark',arena:'equippedArena',frame:'equippedFrame',banner:'equippedBanner',effect:'equippedEffect',emote:'equippedEmote',title:'title'};

async function read(page,route){
  return page.evaluate(async route=>{
    const response=await fetch(route,{cache:'no-store'}),body=await response.json();
    if(!response.ok)throw Error(body.error?.message||`HTTP ${response.status}`);
    return body;
  },route);
}
function remember(user){
  const file=path.resolve('.runtime/e2e-test-users.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const ids=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
  if(!ids.includes(user.id))fs.writeFileSync(file,JSON.stringify([...ids,user.id]));
}
async function enterTitle(page){
  const enter=page.getByRole('button',{name:'Enter the arena',exact:true});
  const ranked=page.getByRole('button',{name:'Play Ranked',exact:true});
  await expect(enter.or(ranked)).toBeVisible();
  if(await enter.isVisible())await enter.click();
}
async function chooseAscendant(page){
  await page.getByRole('button',{name:'Collection theme',exact:true}).click();
  await page.getByRole('dialog',{name:'CHOOSE A WORLD',exact:true})
    .getByRole('button',{name:'Astral Ascendancy',exact:true}).click();
}
async function preview(page,name){
  await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();
  const dialog=page.getByRole('dialog',{name,exact:true});
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(panel=>panel.scrollWidth<=panel.clientWidth+1)).toBe(true);
  return dialog;
}
async function closePreview(page){
  await page.getByRole('button',{name:'Close preview',exact:true}).click();
}
async function setReducedMotion(page,enabled){
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const settings=page.getByRole('dialog',{name:'Settings',exact:true});
  await settings.getByRole('tab',{name:'Graphics/Motion',exact:true}).click();
  const toggle=settings.getByRole('switch',{name:'Reduced motion',exact:true});
  if((await toggle.getAttribute('aria-checked'))!==String(enabled))await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked',String(enabled));
  await settings.getByRole('button',{name:'Save settings',exact:true}).click();
  await expect.poll(async()=>(await read(page,'/api/auth/session')).user.settings.reducedMotion).toBe(enabled);
  await settings.getByRole('button',{name:'Close Settings',exact:true}).click();
}

test.use({reducedMotion:'no-preference',viewport:{width:390,height:844}});

test('Ascendant animated cosmetics preview safely, buy once, equip every slot and preserve real battle marks',async({page})=>{
  test.skip(!fixtureAllowed,'Purchasing fixtures require an isolated local ea_test_ or ea_ci_ database.');
  test.setTimeout(240000);
  const errors=[],missingAssets=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    if(response.url().includes('/assets/collection/ascendant/')&&response.status()>=400)missingAssets.push(response.url());
  });
  let matchId;
  try{
    await page.goto('/');await enterTitle(page);
    await page.getByRole('button',{name:'Player account',exact:true}).click();
    const auth=page.getByRole('dialog');
    await auth.getByRole('button',{name:'Play as guest',exact:true}).click();
    await auth.getByLabel('Player name',{exact:true}).fill(`E2E Astral ${Date.now().toString(36)}`.slice(0,20));
    await auth.getByRole('button',{name:'Enter as a guest',exact:true}).click();
    await expect(auth).toBeHidden();
    const original=(await read(page,'/api/auth/session')).user;remember(original);
    const inventoryBefore=(await read(page,'/api/inventory')).inventory;
    expect(inventoryBefore.filter(entry=>items.some(item=>item.id===entry.cosmeticId))).toHaveLength(0);
    // Only the disposable player's wallet is funded; every unlock below uses
    // the ordinary purchase and equip controls and server ownership checks.
    const {PrismaClient}=await import('@prisma/client'),db=new PrismaClient();
    try{await db.currencyWallet.update({where:{userId:original.id},data:{coins:25000}});}
    finally{await db.$disconnect();}

    await page.goto('/shop');await chooseAscendant(page);
    const collection=page.getByRole('region',{name:'Cosmetic collection',exact:true});
    await expect(collection.locator('.shop-card')).toHaveCount(9);
    await expect(collection.locator('.shop-card[data-rarity="ascendant"][data-animated="true"]')).toHaveCount(9);
    await expect(collection.locator('.shop-card').getByText('ANIMATED',{exact:true})).toHaveCount(9);
    const catalog=(await read(page,'/api/catalog')).cosmetics;
    expect(catalog.filter(item=>item.rarity==='ascendant').map(item=>item.id).sort()).toEqual(items.map(item=>item.id).sort());
    const products=(await read(page,'/api/commerce/products')).products;
    const bundle=products.find(product=>product.id==='bundle-ascendant');
    expect(bundle).toMatchObject({amount:49900,coins:0,currency:'INR',itemCount:9});

    let dialog=await preview(page,'Astral Sovereign');
    const avatarMotion=cosmeticMotion('avatar-collection-ascendant');
    let image=dialog.locator('img[data-cosmetic-gif$="/avatar.gif"]');
    await expect(image).toHaveAttribute('data-cosmetic-motion','animated');
    await expect(image).toHaveAttribute('src',avatarMotion.animatedAsset);
    await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(image).toHaveAttribute('data-cosmetic-motion','still');
    await expect(image).toHaveAttribute('src',avatarMotion.posterAsset);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect(image).toHaveAttribute('src',avatarMotion.animatedAsset);
    await closePreview(page);

    dialog=await preview(page,'Astral Ascendancy Halo');
    await expect(dialog.locator('img[data-cosmetic-gif$="/crest.gif"]')).toHaveCount(1);
    await closePreview(page);
    dialog=await preview(page,'Astral Ascendancy Arrival');
    await expect(dialog.locator('img[data-cosmetic-gif$="/crest.gif"]')).toHaveAttribute('src','/assets/collection/ascendant/crest.gif');
    await closePreview(page);
    dialog=await preview(page,'Astral Ascendancy Sigils');
    await expect(dialog.locator('.preview-board .preview-cell')).toHaveCount(9);
    await expect(dialog.locator('.mark.x.collection-marks svg')).toHaveCount(3);
    await expect(dialog.locator('.mark.o.collection-marks svg')).toHaveCount(2);
    await closePreview(page);

    for(const item of items){
      const card=collection.locator(`.shop-card[data-cosmetic-id="${item.id}"]`);
      const price=item.price.toLocaleString('en-US');
      await card.getByRole('button',{name:`${price} coins`,exact:true}).click();
      await expect(card.getByRole('button',{name:'Equip cosmetic',exact:true})).toBeEnabled();
      const reveal=page.getByRole('button',{name:'Skip cosmetic reveal',exact:true});
      if(await reveal.isVisible())await reveal.click();
    }
    const purchased=(await read(page,'/api/auth/session')).user;
    expect(purchased.coins).toBe(25000-items.reduce((sum,item)=>sum+item.price,0));
    expect(purchased.loadout).toEqual(original.loadout);expect(purchased.cups).toBe(original.cups);
    const inventory=(await read(page,'/api/inventory')).inventory;
    expect(inventory.filter(entry=>items.some(item=>item.id===entry.cosmeticId))).toHaveLength(9);
    await page.getByRole('button',{name:'Collections',exact:true}).click();
    await expect(page.getByLabel('Cash cosmetic collections',{exact:true}).locator('article').filter({
      has:page.getByRole('heading',{name:'Astral Ascendancy Collection',exact:true}),
    }).getByRole('button',{name:'Owned',exact:true})).toBeDisabled();

    await page.goto('/inventory');
    for(const item of items){
      const card=page.locator('.shop-card').filter({has:page.getByRole('heading',{name:item.name,exact:true})});
      await card.getByRole('button',{name:'Equip cosmetic',exact:true}).click();
      await expect(card.getByRole('button',{name:'Equipped',exact:true})).toBeDisabled();
    }
    await page.reload();
    const equipped=(await read(page,'/api/auth/session')).user;
    for(const item of items)expect(equipped.profile[fields[item.type]]).toBe(item.type==='title'?item.name:item.id);
    if(process.env.ASCENDANT_CAPTURE&&!process.env.CI)await page.context().storageState({path:'.runtime/ascendant-preview-state.json'});
    expect(equipped.loadout).toEqual(original.loadout);
    const header=page.getByRole('button',{name:'Player account',exact:true});
    const headerAvatar=header.locator('img[data-cosmetic-gif$="/avatar.gif"]');
    await expect(headerAvatar).toHaveAttribute('data-cosmetic-motion','animated');
    await expect(headerAvatar).toHaveAttribute('src',avatarMotion.motionAsset);
    await expect(header.locator('img[data-cosmetic-gif$="/crest.gif"]')).toHaveCount(2);
    await setReducedMotion(page,true);
    await expect(headerAvatar).toHaveAttribute('src',avatarMotion.posterAsset);
    await expect(headerAvatar).toHaveAttribute('data-cosmetic-motion','still');
    await page.goto('/shop');await chooseAscendant(page);
    dialog=await preview(page,'Astral Sovereign');
    image=dialog.locator('img[data-cosmetic-gif$="/avatar.gif"]');
    await expect(image).toHaveAttribute('src',avatarMotion.posterAsset);
    await closePreview(page);await setReducedMotion(page,false);

    await page.goto('/powers');
    await page.getByRole('tab',{name:'Power Lab',exact:true}).click();
    const labBoard=page.getByRole('group',{name:'Power laboratory board',exact:true});
    await expect(labBoard.locator('button')).toHaveCount(9);
    await expect(labBoard.locator('.mark.x svg').first()).toBeVisible();
    await expect(labBoard.locator('.mark.o svg').first()).toBeVisible();
    await page.goto('/');await enterTitle(page);
    await expect(page.locator('[style*="--world-art"]')).toHaveCSS('--world-art',/ascendant\/arena.webp/);
    await page.getByRole('button',{name:'Select battle mode',exact:true}).click();
    await page.getByRole('dialog',{name:'Choose your battle',exact:true})
      .getByRole('button',{name:'Practice Arena',exact:true}).click();
    const practice=page.getByRole('dialog',{name:'Sharpen your next move',exact:true});
    await practice.getByRole('button',{name:'Classic',exact:true}).click();
    await practice.getByRole('button',{name:'Beginner',exact:true}).click();
    await practice.getByRole('button',{name:'Enter Practice Arena',exact:true}).click();
    await expect(page).toHaveURL(/\/battle$/);
    const board=page.getByRole('group',{name:'Three by three elemental game board',exact:true});
    await expect(board).toHaveAttribute('data-cosmetic-theme','ascendant');
    await expect(board.getByRole('button')).toHaveCount(9);
    const active=(await read(page,'/api/matches/active')).match;matchId=active.matchId;
    expect(active.mode).toBe('ai');expect(active.ruleset).toBe('classic');
    expect(active.state.players.find(player=>player.id===original.id).loadout).toEqual([]);
    expect((await read(page,'/api/auth/session')).user.loadout).toEqual(original.loadout);
    const mark=active.state.players.find(player=>player.id===original.id).mark;
    await board.locator('button:enabled').first().click();
    await expect(board.locator(`.collection-marks.${mark.toLowerCase()} svg`).first()).toBeVisible();
    await expect.poll(async()=>(await read(page,'/api/matches/active')).match.state.history.some(action=>action.playerId!==original.id)).toBe(true);
    await expect(board.locator('.mark.x svg').first()).toBeVisible();
    await expect(board.locator('.mark.o svg').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.getByRole('button',{name:'Battle menu',exact:true}).click();
    await page.locator('.battle-controls').getByRole('button',{name:'Surrender',exact:true}).click();
    await page.getByRole('dialog',{name:'Leave this battle?',exact:true}).getByRole('button',{name:'Surrender',exact:true}).click();
    await expect(page.locator('.result-panel')).toBeVisible();
    expect(missingAssets).toEqual([]);expect(errors).toEqual([]);
  }finally{
    if(matchId)await page.evaluate(async id=>{
      await fetch(`/api/matches/${id}/surrender`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID()})});
    },matchId).catch(()=>{});
  }
});
