import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { COLLECTION_COSMETICS, COLLECTION_BUNDLES } from '../src/lib/cosmetic-collection.js';

const items = COLLECTION_COSMETICS.filter(item => item.id.endsWith('-collection-dominion'));
const bundle = COLLECTION_BUNDLES.find(product => product.id === 'bundle-dominion');

// Browser contract tests use a fake provider and API. They never create users,
// change a real wallet or send a payment to Razorpay.
async function fixture(page, { checkoutEnabled = false, owned = [] } = {}) {
  const state = { owned: [...owned], orders: [], coinPurchases: [], verifies: 0 };
  const user = { id: 'dominion-ui-fixture', name: 'Premium Preview', guest: false, role: 'PLAYER', cups: 100, coins: 999999, xp: 100, level: 2, loadout: ['fire', 'shield', 'portal'], profile: { avatar: 'avatar-void' }, settings: { reducedMotion: false, sound: false } };
  await page.addInitScript(() => sessionStorage.setItem('ea:entered', '1'));
  await page.routeWebSocket(url => url.pathname.startsWith('/socket.io/'), socket => {
    socket.send('0{"sid":"dominion-ui-socket","upgrades":[],"pingInterval":60000,"pingTimeout":60000,"maxPayload":1000000}');
    socket.onMessage(message => {
      if (typeof message === 'string' && message.startsWith('40')) socket.send('40{"sid":"dominion-ui-socket"}');
      if (message === '2') socket.send('3');
    });
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    let json = {};
    if (path === '/api/auth/session') json = { user, features: {} };
    else if (path === '/api/catalog') json = { cosmetics: COLLECTION_COSMETICS, powers: [] };
    else if (path === '/api/inventory') json = { inventory: state.owned.map(id => ({ cosmeticId: id, cosmetic: items.find(item => item.id === id) })) };
    else if (path === '/api/commerce/products') json = { checkoutEnabled, products: [bundle], passCoinPrice: 900 };
    else if (path === '/api/missions') json = { daily: { claimedToday: true }, missions: [], weeklyMissions: [] };
    else if (path === '/api/season-pass') json = { tiers: [], premiumTiers: [] };
    else if (path === '/api/notifications') json = { notifications: [] };
    else if (path === '/api/friends') json = { friends: [], requests: [], challenges: [] };
    else if (path === '/api/commerce/orders' && route.request().method() === 'POST') {
      state.orders.push(route.request().postDataJSON());
      json = { orderId: 'mock-order', providerOrderId: 'order_mock', amount: bundle.amount, currency: bundle.currency, keyId: 'mock-key', name: 'Elemental Arena', description: bundle.name };
    } else if (path === '/api/commerce/verify') {
      state.verifies += 1;
      state.owned = items.map(item => item.id);
      json = { ok: true };
    } else if (path === '/api/purchases') {
      state.coinPurchases.push(route.request().postDataJSON());
      return route.fulfill({ status: 403, json: { ok: false, error: { code: 'REAL_MONEY_ONLY', message: 'Premium set only.' } } });
    }
    await route.fulfill({ json });
  });
  await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({ contentType: 'application/javascript', body: `window.Razorpay = class { constructor(options) { this.options = options; } on() {} close() {} open() { this.options.handler({ razorpay_payment_id: 'pay_mock', razorpay_order_id: 'order_mock', razorpay_signature: 'mock-signature' }); } };` }));
  return state;
}

async function capture(page, label) {
  if (!process.env.DOMINION_CAPTURE) return;
  const directory = path.resolve('docs/screenshots/dominion');
  fs.mkdirSync(directory, { recursive: true });
  for (const [width, height] of [[360, 740], [1440, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    if (label === 'premium-checkout') await page.getByRole('button', { name: 'Checkout unavailable', exact: true }).scrollIntoViewIfNeeded();
    else if (label === 'catalog' || label === 'premium') await page.locator('[class*="catalogScroll"]').evaluate(element => element.scrollTop = 0);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(directory, `${label}-${width}x${height}.png`) });
  }
}

test('premium set previews all nine slots on phones and never offers a coin purchase', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fixture(page);
  if (process.env.DOMINION_CAPTURE) await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Collection theme', exact: true }).click();
  await page.getByRole('dialog', { name: 'CHOOSE A WORLD' }).getByRole('button', { name: 'Eternal Dominion', exact: true }).click();
  const cards = page.locator('.shop-card[data-rarity="sovereign"]');
  await expect(cards).toHaveCount(9);
  await expect(cards.getByRole('button', { name: /coins/ })).toHaveCount(0);
  await capture(page, 'catalog');
  await cards.first().getByRole('button', { name: 'View premium set', exact: true }).click();
  const offer = page.getByRole('region', { name: 'Eternal Dominion premium set', exact: true });
  await expect(offer.getByText('₹2,499', { exact: true })).toBeVisible();
  await expect(offer.getByRole('button', { name: 'Checkout unavailable', exact: true })).toBeDisabled();
  await expect(offer.locator('[data-premium-slot]')).toHaveCount(9);
  // Absolute-positioned arena/banner art must stay inside its thumbnail,
  // leaving the actual slot label visible and unobscured below the image.
  for (const type of ['arena', 'banner']) {
    const label = offer.locator(`[data-premium-slot="${type}"] > span`).last();
    await label.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
    expect(await label.evaluate(el => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit === el || el.contains(hit);
    })).toBe(true);
  }
  await offer.locator('[data-premium-slot]').first().scrollIntoViewIfNeeded();
  await page.locator('[class*="catalogScroll"]').evaluate(element => element.scrollTop = 0);
  await capture(page, 'premium');
  await capture(page, 'premium-checkout');
  for (const item of items) {
    await offer.getByRole('button', { name: `Preview ${item.name}`, exact: true }).click();
    const preview = page.getByRole('dialog', { name: item.name, exact: true });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole('button', { name: 'View premium set', exact: true })).toBeEnabled();
    await expect(preview.getByRole('button', { name: /coins/ })).toHaveCount(0);
    if (['avatar', 'board', 'banner', 'frame'].includes(item.type)) await capture(page, `preview-${item.type}`);
    await preview.getByRole('button', { name: 'Close preview', exact: true }).click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(state.coinPurchases).toEqual([]);
  expect(state.orders).toEqual([]);
  expect(errors).toEqual([]);
});

test('premium checkout buys only the complete bundle and refreshes its ownership', async ({ page }) => {
  const state = await fixture(page, { checkoutEnabled: true });
  await page.goto('/shop');
  await page.getByRole('button', { name: 'EXPLORE PREMIUM SET', exact: true }).click();
  const offer = page.getByRole('region', { name: 'Eternal Dominion premium set', exact: true });
  await offer.getByRole('button', { name: 'Buy Eternal Dominion', exact: true }).click();
  await expect(offer.getByRole('button', { name: 'Collection owned', exact: true })).toBeDisabled();
  await expect(offer.getByText('All nine styles owned', { exact: true })).toBeVisible();
  expect(state.orders).toHaveLength(1);
  expect(state.orders[0].sku).toBe('bundle-dominion');
  expect(state.verifies).toBe(1);
  expect(state.coinPurchases).toEqual([]);
});
