import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COSMETIC_THEMES, COSMETIC_TYPES, COLLECTION_COSMETICS, COLLECTION_BUNDLES,
  cosmeticById, cosmeticTheme, cosmeticAsset, cosmeticMotion, cosmeticStyle, cosmeticEmotes,
} from '../src/lib/cosmetic-collection.js';

test('Ascendant adds a complete nine-slot cosmetic collection without altering legacy style records',()=>{
  const theme=COSMETIC_THEMES.find(item=>item.id==='ascendant');
  assert.equal(theme.name,'Astral Ascendancy');
  assert.equal(theme.primary,'#fff1c2');assert.equal(theme.secondary,'#a4f7ff');
  const items=COLLECTION_COSMETICS.filter(item=>item.rarity==='ascendant');
  assert.equal(items.length,9);assert.deepEqual(items.map(item=>item.type),COSMETIC_TYPES);
  assert.equal(new Set(COLLECTION_COSMETICS.map(item=>item.id)).size,COLLECTION_COSMETICS.length);
  for(const item of items){
    assert.equal(cosmeticTheme(item.id),theme);assert.equal(cosmeticById(item.id),item);
    assert.ok(item.description.includes('Cosmetic only'));assert.ok(item.price>0&&Number.isInteger(item.price));
    assert.deepEqual(Object.keys(item).sort(),['asset','description','id','name','price','rarity','type']);
    const equivalent=cosmeticById(`${item.type}-collection-solar`);assert.ok(item.price>equivalent.price);
  }
  const previous=COLLECTION_COSMETICS.filter(item=>item.rarity!=='ascendant');assert.equal(previous.length,90);
  assert.deepEqual(previous.filter(item=>item.type==='avatar').map(item=>item.price),Array(10).fill(500));
  assert.equal(cosmeticAsset('avatar-collection-solar'),'/assets/collection/avatar-solar.webp');
  assert.equal(cosmeticAsset('avatar-void'),'/assets/avatar-void.png');
  assert.equal(cosmeticById('title-collection-ascendant').name,'Beyond the Stars');
});

test('Ascendant motion has GIF, optimized WebP and static reduced-motion poster paths for every slot',()=>{
  for(const type of COSMETIC_TYPES){
    const id=`${type}-collection-ascendant`,motion=cosmeticMotion(id);
    const art=type==='avatar'?'avatar':['board','arena','banner'].includes(type)?'arena':'crest';
    assert.deepEqual(motion,{
      animatedAsset:`/assets/collection/ascendant/${art}.gif`,
      motionAsset:`/assets/collection/ascendant/${art}.webp`,
      posterAsset:`/assets/collection/ascendant/${art}-poster.webp`,
    });
    if(['avatar','board','arena','banner'].includes(type))assert.equal(cosmeticAsset(id),motion.posterAsset);
  }
  assert.equal(cosmeticMotion('avatar-collection-solar'),null);
  assert.equal(cosmeticMotion('not-a-cosmetic'),null);
  assert.equal(cosmeticStyle('arena-collection-ascendant')['--cosmetic-art'],'url("/assets/collection/ascendant/arena-poster.webp")');
  assert.equal(cosmeticStyle('arena-collection-ascendant')['--cosmetic-motion-art'],'url("/assets/collection/ascendant/arena.webp")');
  assert.equal(cosmeticStyle('board-collection-solar')['--cosmetic-art'],'url("/assets/collection/arena-solar.webp")');
});

test('Ascendant bundle contains only the nine canonical styles and its two emotes remain ownership controlled',()=>{
  const bundle=COLLECTION_BUNDLES.find(item=>item.id==='bundle-ascendant');
  assert.equal(bundle.amount,49900);assert.equal(bundle.currency,'INR');assert.equal(bundle.coins,0);
  assert.equal(bundle.themeId,'ascendant');assert.equal(bundle.kind,'bundle');
  assert.deepEqual(bundle.cosmeticIds,COSMETIC_TYPES.map(type=>`${type}-collection-ascendant`));
  assert.ok(bundle.cosmeticIds.every(id=>cosmeticById(id)));
  assert.equal(COLLECTION_BUNDLES.filter(item=>item.id!=='bundle-ascendant').length,10);
  assert.ok(COLLECTION_BUNDLES.filter(item=>item.id!=='bundle-ascendant').every(item=>item.amount===14900));
  assert.deepEqual(cosmeticEmotes('emote-collection-ascendant'),['supernova','infinity']);
  assert.deepEqual(cosmeticEmotes('unknown'),[]);
});
