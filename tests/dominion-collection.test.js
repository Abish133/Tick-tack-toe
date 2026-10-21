import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COSMETIC_TYPES, COLLECTION_COSMETICS, COLLECTION_BUNDLES,
  cosmeticById, cosmeticTheme, cosmeticMotion, cosmeticStyle,
  cosmeticEmotes, isCashOnlyCosmetic, premiumBundleForCosmetic, cosmeticPurchaseMetadata,
} from '../src/lib/cosmetic-collection.js';
import {commerceProducts, premiumTiers, checkoutConfigured} from '../src/server/commerce-policy.mjs';
import {purchaseCosmetic} from '../src/server/players.mjs';

const bundle = COLLECTION_BUNDLES.find(item => item.id === 'bundle-dominion');

test('Eternal Dominion contains every equip slot and is separated from coin-priced collections', () => {
  assert.equal(bundle.name, 'Eternal Dominion Collection');
  assert.equal(bundle.rarity, 'sovereign');
  assert.equal(bundle.purchaseMode, 'real-money');
  assert.equal(bundle.amount, 249900);
  assert.equal(bundle.currency, 'INR');
  assert.equal(bundle.coins, 0);
  assert.deepEqual(bundle.cosmeticIds, COSMETIC_TYPES.map(type => `${type}-collection-dominion`));
  assert.equal(new Set(bundle.cosmeticIds).size, 9);
  for (const id of bundle.cosmeticIds) {
    const item = cosmeticById(id);
    assert.equal(item.rarity, 'sovereign');
    assert.equal(item.price, 0, 'No coin price is offered for cash-only styles');
    assert.equal(cosmeticTheme(id).name, 'Eternal Dominion');
    assert.ok(item.description.includes('Cosmetic only'));
    assert.ok(item.description.includes('real-money'));
    assert.ok(item.description.length <= 250);
    assert.equal(isCashOnlyCosmetic(id), true);
    assert.equal(premiumBundleForCosmetic(id), bundle);
    assert.deepEqual(cosmeticPurchaseMetadata(id), {purchaseMode: 'real-money', bundleId: bundle.id});
    assert.ok(!premiumTiers.some(tier => tier.cosmeticId === id));
  }
  assert.equal(COLLECTION_COSMETICS.filter(item => isCashOnlyCosmetic(item.id)).length, 9);
  for (const id of ['avatar-void', 'avatar-collection-solar', 'avatar-collection-ascendant', 'unknown', null]) {
    assert.equal(isCashOnlyCosmetic(id), false);
    assert.equal(premiumBundleForCosmetic(id), null);
    assert.deepEqual(cosmeticPurchaseMetadata(id), {});
  }
});

test('A direct coin-purchase request rejects every Dominion style before touching a wallet or database', async () => {
  for (const id of bundle.cosmeticIds) {
    await assert.rejects(
      purchaseCosmetic('no-database-user', id, `blocked-cash-style-${id}`),
      error => error.code === 'REAL_MONEY_ONLY' && error.status === 403,
    );
  }
});

test('Dominion uses an independent server price and cannot become a free checkout', () => {
  const find = env => commerceProducts(env).find(product => product.id === bundle.id);
  assert.equal(find({}).amount, 249900);
  assert.equal(find({RAZORPAY_DOMINION_PAISE: '299900'}).amount, 299900);
  assert.equal(find({RAZORPAY_COLLECTION_PAISE: '100', RAZORPAY_ASCENDANT_PAISE: '100'}).amount, 249900);
  assert.equal(commerceProducts({RAZORPAY_DOMINION_PAISE: '299900'}).find(product => product.id === 'bundle-ascendant').amount, 49900);
  for (const value of ['0', '-100', '2499.5', 'invalid', '100000000']) {
    assert.throws(() => find({RAZORPAY_DOMINION_PAISE: value}), error => error.code === 'PAYMENT_CONFIG');
  }
  assert.equal(checkoutConfigured({}), false);
});

test('All Dominion slots have motion, static fallbacks and matching profile art', () => {
  for (const type of COSMETIC_TYPES) {
    const id = `${type}-collection-dominion`;
    const art = type === 'avatar' ? 'avatar' : type === 'banner' ? 'banner' : ['board', 'arena'].includes(type) ? 'arena' : 'crest';
    assert.deepEqual(cosmeticMotion(id), {
      animatedAsset: `/assets/collection/dominion/${art}.gif`,
      motionAsset: `/assets/collection/dominion/${art}.webp`,
      posterAsset: `/assets/collection/dominion/${art}-poster.webp`,
    });
  }
  assert.equal(cosmeticStyle('banner-collection-dominion')['--cosmetic-art'], 'url("/assets/collection/dominion/banner-poster.webp")');
  assert.equal(cosmeticStyle('banner-collection-dominion')['--cosmetic-motion-art'], 'url("/assets/collection/dominion/banner.webp")');
  assert.equal(cosmeticStyle('board-collection-dominion')['--cosmetic-art'], 'url("/assets/collection/dominion/arena-poster.webp")');
  assert.deepEqual(cosmeticEmotes('emote-collection-dominion'), ['dominion-crown', 'dominion-eclipse']);
});
