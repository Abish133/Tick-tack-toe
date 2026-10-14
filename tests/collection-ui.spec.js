import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {test,expect} from '@playwright/test';
import {COLLECTION_COSMETICS,COSMETIC_TYPES} from '../src/lib/cosmetic-collection.js';


async function enterTitle(page){const enter=page.getByRole('button',{name:'Enter the arena',exact:true}),ranked=page.getByRole('button',{name:'Play Ranked',exact:true});await expect(enter.or(ranked)).toBeVisible();if(await enter.isVisible())await enter.click();}

const target=new URL(process.env.E2E_BASE_URL||'http://localhost:3000');
const database=process.env.DATABASE_URL?new URL(process.env.DATABASE_URL):null;
const fixtureAllowed=['localhost','127.0.0.1','[::1]'].includes(target.hostname)&&database&&/^ea_(?:test|ci)_/.test(database.pathname.slice(1))&&!['false','0'].includes(String(process.env.E2E_ALLOW_DB_FIXTURES||'').toLowerCase());
const labels={avatar:'Avatars',board:'Boards',marks:'Marks',arena:'Arenas',frame:'Frames',banner:'Banners',effect:'Effects',emote:'Emotes',title:'Titles'};
async function read(page,route){return page.evaluate(async route=>{const response=await fetch(route,{cache:'no-store'}),body=await response.json();if(!response.ok)throw Error(body.error?.message||`HTTP ${response.status}`);return body;},route);}
function remember(user){const file=path.resolve('.runtime/e2e-test-users.json');fs.mkdirSync(path.dirname(file),{recursive:true});const ids=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];if(!ids.includes(user.id))fs.writeFileSync(file,JSON.stringify([...ids,user.id]));}

test('large collection filters all nine categories, previews real marks and stays usable on mobile',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/shop');
 const catalog=await read(page,'/api/catalog');expect(catalog.cosmetics.length).toBeGreaterThanOrEqual(103);
 const collection=page.getByRole('region',{name:'Cosmetic collection',exact:true});
 await expect(collection.locator('.shop-card')).toHaveCount(24);
 for(const type of COSMETIC_TYPES){
  await collection.getByRole('button',{name:new RegExp(`^${labels[type]}\\s*\\d+`)}).click();
  await expect(collection.locator('.shop-card')).toHaveCount(catalog.cosmetics.filter(item=>item.type===type).length);
  expect(await collection.locator('.shop-card').evaluateAll(cards=>cards.map(card=>card.dataset.cosmeticType))).toEqual(Array(catalog.cosmetics.filter(item=>item.type===type).length).fill(type));
 }
 await collection.getByRole('button',{name:/^All styles\s*\d+/}).click();
 await page.getByLabel('Collection theme',{exact:true}).selectOption('solar');
 await expect(collection.locator('.shop-card')).toHaveCount(9);
 await collection.getByRole('button',{name:'Preview Solar Dynasty Sigils',exact:true}).click();
 const preview=page.getByRole('dialog',{name:'Solar Dynasty Sigils',exact:true});
 await expect(preview.locator('.preview-board .preview-cell')).toHaveCount(9);
 await expect(preview.locator('.collection-marks svg')).toHaveCount(5);
 await page.keyboard.press('Escape');await expect(preview).toBeHidden();
 await page.getByLabel('Search cosmetics',{exact:true}).fill('not-a-real-cosmetic');
 await expect(collection.getByRole('heading',{name:'No styles match this search'})).toBeVisible();
 await collection.getByRole('button',{name:'Show all styles'}).click();
 await expect(collection.locator('.shop-card')).toHaveCount(24);
 await collection.getByRole('button',{name:'Show 24 more styles',exact:true}).click();
 await expect(collection.locator('.shop-card')).toHaveCount(48);
 await page.getByLabel('Search cosmetics',{exact:true}).fill('Prism Owl');
 await expect(collection.locator('.shop-card')).toHaveCount(1);
 await collection.getByRole('button',{name:'Preview Prism Owl',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Prism Owl',exact:true}).locator('img')).toHaveAttribute('src','/assets/collection/avatar-arctic.webp');
 await page.getByRole('button',{name:'Close preview'}).click();
 await page.getByRole('button',{name:'Clear search'}).click();
 const payments=await read(page,'/api/commerce/products');
 const bundles=page.getByLabel('Cash cosmetic collections',{exact:true});await expect(bundles.locator('article')).toHaveCount(10);
 if(!payments.checkoutEnabled){await expect(page.getByText('Payments not enabled yet.',{exact:true})).toBeVisible();await expect(bundles.getByRole('button',{name:'Checkout opens after setup'})).toHaveCount(10);for(const button of await bundles.getByRole('button',{name:'Checkout opens after setup'}).all())await expect(button).toBeDisabled();}
 await bundles.locator('article').first().getByRole('button',{name:'Explore nine styles'}).click();await expect(page.getByLabel('Collection theme',{exact:true})).toHaveValue('solar');await expect(collection.locator('.shop-card')).toHaveCount(9);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await collection.getByRole('button',{name:'Preview Sunfire Phoenix',exact:true}).click();await expect(page.getByRole('dialog',{name:'Sunfire Phoenix'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByRole('button',{name:'Close preview'}).click();
 expect(errors).toEqual([]);
});

test('earned coins buy every solar style once and equipped art appears in the actual game',async({page})=>{
 test.skip(!fixtureAllowed,'Purchasing fixture requires an isolated local ea_test_ or ea_ci_ database.');
 test.setTimeout(180_000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await enterTitle(page);await page.getByRole('button',{name:'Player account',exact:true}).click();
 const auth=page.getByRole('dialog');await auth.getByRole('button',{name:'Play as guest',exact:true}).click();
 const tag=Date.now().toString(36);await auth.getByLabel('Player name',{exact:true}).fill(`E2E Collection ${tag}`.slice(0,20));await auth.getByRole('button',{name:'Enter as a guest'}).click();await expect(auth).toBeHidden();
 const user=(await read(page,'/api/auth/session')).user;remember(user);
 const {PrismaClient}=await import('@prisma/client'),db=new PrismaClient();try{await db.currencyWallet.update({where:{userId:user.id},data:{coins:5000}});}finally{await db.$disconnect();}
 await page.goto('/shop');await page.getByLabel('Collection theme',{exact:true}).selectOption('solar');
 const items=COLLECTION_COSMETICS.filter(item=>item.id.endsWith('-solar'));
 for(const item of items){const card=page.locator('.shop-card').filter({has:page.getByRole('heading',{name:item.name,exact:true})});await card.getByRole('button',{name:new RegExp(`${item.price} coins`)}).click();await expect(card.getByRole('button',{name:'Owned',exact:true})).toBeDisabled();}
 expect((await read(page,'/api/auth/session')).user.coins).toBe(5000-items.reduce((sum,item)=>sum+item.price,0));
 const solar=page.getByLabel('Cash cosmetic collections',{exact:true}).locator('article').filter({has:page.getByRole('heading',{name:'Solar Dynasty Collection',exact:true})});await expect(solar.getByRole('button',{name:'Owned',exact:true})).toBeDisabled();
 await page.goto('/inventory');
 for(const item of items){const card=page.locator('.shop-card').filter({has:page.getByRole('heading',{name:item.name,exact:true})});await card.getByRole('button',{name:'Equip cosmetic',exact:true}).click();await expect(card.getByRole('button',{name:'Equipped',exact:true})).toBeDisabled();}
 const equipped=(await read(page,'/api/auth/session')).user;expect(equipped.profile.avatar).toBe('avatar-collection-solar');expect(equipped.profile.equippedEmote).toBe('emote-collection-solar');expect(equipped.loadout).toEqual(user.loadout);
 await expect(page.locator('[aria-label="Player account"] .avatar img')).toHaveAttribute('src','/assets/collection/avatar-solar.webp');
 await page.goto('/');await enterTitle(page);await expect(page.locator('.hero-board .preview-board.collection-board')).toHaveAttribute('data-cosmetic-theme','solar');await expect(page.locator('.hero-board .collection-marks svg')).toHaveCount(5);await expect(page.locator('.hero-image')).toHaveCSS('background-image',/arena-solar.webp/);
 await page.getByRole('button',{name:'Choose your challenge'}).click();await page.getByRole('dialog').getByRole('button',{name:'Enter Practice Arena'}).click();await expect(page).toHaveURL(/\/battle$/);
 await expect(page.getByRole('group',{name:'Three by three elemental game board'})).toHaveClass(/collection-board/);await expect(page.getByRole('button',{name:'Shine on!',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Royal move!',exact:true})).toBeVisible();
 await page.locator('.battle-controls').getByRole('button',{name:'Surrender',exact:true}).click();await page.getByRole('dialog',{name:'Leave this battle?'}).getByRole('button',{name:'Surrender',exact:true}).click();await expect(page.locator('.result-panel')).toBeVisible();
 expect(errors).toEqual([]);
});
