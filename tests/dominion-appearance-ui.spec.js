import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { COLLECTION_COSMETICS, cosmeticMotion } from '../src/lib/cosmetic-collection.js';

const target = new URL(process.env.E2E_BASE_URL || 'http://localhost:3000');
const database = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const fixtureAllowed = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  && database && /^ea_(?:test|ci)_/.test(database.pathname.slice(1))
  && !['false', '0'].includes(String(process.env.E2E_ALLOW_DB_FIXTURES || '').toLowerCase());
const items = COLLECTION_COSMETICS.filter(item => item.id.endsWith('-collection-dominion'));
const fields = { avatar: 'avatar', board: 'equippedBoard', marks: 'equippedMark', arena: 'equippedArena', frame: 'equippedFrame', banner: 'equippedBanner', effect: 'equippedEffect', emote: 'equippedEmote', title: 'title' };

async function api(page, route, method = 'GET', body) {
  const response = await page.request.fetch(`/api${route}`, {
    method,
    headers: { origin: target.origin },
    ...(body ? { data: body } : {}),
  });
  const data = await response.json();
  expect(response.ok(), `${method} ${route}: ${data.error?.message || response.status()}`).toBe(true);
  return data;
}
async function screenshot(page, name) {
  fs.mkdirSync('.runtime/dominion-appearance', { recursive: true });
  await page.screenshot({ path: path.resolve(`.runtime/dominion-appearance/${name}.png`) });
}

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });

test('all nine Dominion styles equip, render in profile and battle, and respect reduced motion', async ({ page }) => {
  test.skip(!fixtureAllowed, 'Appearance fixtures require a local isolated ea_test_ or ea_ci_ database.');
  test.setTimeout(180000);
  const errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/assets/collection/dominion/') && response.status() >= 400) missing.push(response.url());
  });
  await page.addInitScript(() => sessionStorage.setItem('ea:entered', '1'));
  const name = `E2E Dominion ${Date.now().toString(36)}`.slice(0, 20);
  const created = await api(page, '/auth/guest', 'POST', { name });
  const user = created.user;
  expect(user.name).toBe(name);
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  let matchId;
  try {
    // Preload only this newly created disposable player's inventory. Payment,
    // reward and coin-bypass enforcement are covered by the separate commerce tests.
    const fixture = await db.user.findUnique({ where: { id: user.id } });
    expect(fixture?.name).toBe(name);
    expect(fixture.name.startsWith('E2E Dominion ')).toBe(true);
    await db.playerInventory.createMany({ data: items.map(item => ({ userId: user.id, cosmeticId: item.id })), skipDuplicates: true });
    for (const item of items) {
      const equipped = (await api(page, '/inventory/equip', 'POST', { cosmeticId: item.id })).user;
      expect(equipped.profile[fields[item.type]]).toBe(item.type === 'title' ? item.name : item.id);
    }
    const equipped = (await api(page, '/auth/session')).user;
    expect(equipped.loadout).toEqual(user.loadout);
    expect(equipped.cups).toBe(user.cups);
    expect(equipped.coins).toBe(user.coins);

    await page.goto('/inventory');
    const owned = page.getByRole('region', { name: 'Owned cosmetic collection', exact: true });
    await expect(owned.locator('.shop-card[data-rarity="sovereign"]')).toHaveCount(9);
    await expect(owned.locator('.shop-card[data-rarity="sovereign"]').getByRole('button', { name: 'Equipped', exact: true })).toHaveCount(9);
    await expect(page.locator('img[data-cosmetic-gif$="/dominion/avatar.gif"]').first()).toHaveAttribute('data-cosmetic-motion', 'animated');
    await screenshot(page, 'inventory-mobile');

    await page.goto('/profile');
    const title = page.locator('.collection-profile-title[data-cosmetic-theme="dominion"]');
    await expect(title).toHaveText('The Eternal Sovereign');
    const identity = page.locator('.collection-profile-identity.banner-collection-dominion');
    await expect(identity).toBeVisible();
    const banner = identity.locator('.banner-backdrop[data-banner="banner-collection-dominion"] > img');
    await expect(banner).toHaveAttribute('src', '/assets/collection/dominion/banner.webp');
    const portrait = page.locator('.collection-profile-portrait');
    await expect(portrait.locator('img[data-cosmetic-gif$="/dominion/avatar.gif"]')).toHaveAttribute('src', cosmeticMotion('avatar-collection-dominion').motionAsset);
    await expect(portrait.locator('svg path')).not.toHaveCount(0);
    await expect(portrait.locator('img[data-cosmetic-gif$="/dominion/crest.gif"]')).toHaveAttribute('data-cosmetic-motion', 'animated');
    for (const image of await portrait.locator('img').all())
      await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await screenshot(page, 'profile-mobile');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await screenshot(page, 'profile-desktop');
    await page.setViewportSize({ width: 390, height: 844 });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    // The game's own Reduced motion setting remains the single source of truth.
    // An OS preference alone does not override the player's in-game choice.
    await expect(portrait.locator('img[data-cosmetic-gif$="/dominion/avatar.gif"]')).toHaveAttribute('src', '/assets/collection/dominion/avatar.webp');
    await expect(portrait.locator('img[data-cosmetic-gif$="/dominion/crest.gif"]')).toHaveAttribute('src', '/assets/collection/dominion/crest.webp');
    await expect(banner).toHaveAttribute('src', '/assets/collection/dominion/banner.webp');
    await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'more' });
    await expect(title).toHaveCSS('color', 'rgb(255, 240, 196)');
    await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'no-preference' });

    const started = await api(page, '/matches', 'POST', { mode: 'ai', ruleset: 'classic', difficulty: 'beginner', boardSize: 4 });
    matchId = started.matchId;
    // Sovereign signatures are brief, so record them as they appear.
    await page.addInitScript(() => {
      window.__sovereign = { strikes: 0, entrance: false };
      new MutationObserver(() => {
        if (document.querySelector('[data-sovereign-strike]')) window.__sovereign.strikes += 1;
        if (document.querySelector('[data-sovereign]')) window.__sovereign.entrance = true;
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/battle');
    await expect.poll(() => page.evaluate(() => window.__sovereign.entrance)).toBe(true);
    const board = page.getByRole('group', { name: '4 by 4 classic game board', exact: true });
    await expect(board).toHaveAttribute('data-cosmetic-theme', 'dominion');
    await expect(board.getByRole('button')).toHaveCount(16);
    await expect(board).toHaveCSS('background-image', /dominion\/arena.webp/);
    const battleBanner = page.locator('.hud-banner[data-banner="banner-collection-dominion"] > img');
    await expect(battleBanner).toHaveAttribute('src', '/assets/collection/dominion/banner.webp');
    await expect(page.locator('.player-title-tag[data-cosmetic-theme="dominion"]').first()).toHaveText('The Eternal Sovereign');
    const first = board.locator('button:enabled').first();
    await expect(first).toBeEnabled();
    await first.click();
    const ownMark = started.state.players.find(player => player.id === user.id).mark.toLowerCase();
    const mark = board.locator(`.mark.${ownMark}.collection-marks svg`).first();
    await expect(mark).toBeVisible();
    await expect(mark).toHaveCSS('animation-name', /dominion-mark-light/);
    await expect.poll(() => page.evaluate(() => window.__sovereign.strikes)).toBeGreaterThan(0);
    expect(await mark.locator('path').count()).toBeGreaterThanOrEqual(3);
    await screenshot(page, 'battle-mobile');
    await page.getByRole('button', { name: 'Match emotes', exact: true }).click();
    const signals = page.getByRole('dialog', { name: 'Match emotes', exact: true });
    await expect(signals.getByRole('button', { name: 'Claim the crown!', exact: true })).toBeVisible();
    await expect(signals.getByRole('button', { name: 'An imperial play!', exact: true })).toBeVisible();
    await signals.getByRole('button', { name: 'Close Match emotes', exact: true }).click();

    // Server-backed preference also produces static media and static ornaments.
    await api(page, '/settings', 'PATCH', { ...equipped.settings, reducedMotion: true });
    await page.reload();
    await expect(board).toHaveCSS('background-image', /dominion\/arena-poster.webp/);
    await expect(board.locator(`.mark.${ownMark}.collection-marks svg`).first()).toHaveCSS('animation-name', 'none');
    await expect(page.locator('img[data-cosmetic-gif$="/dominion/avatar.gif"]').first()).toHaveAttribute('src', '/assets/collection/dominion/avatar-poster.webp');
    await expect(battleBanner).toHaveAttribute('src', '/assets/collection/dominion/banner-poster.webp');
    expect(missing).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    if (matchId) await api(page, `/matches/${matchId}/surrender`, 'POST', { requestId: crypto.randomUUID() }).catch(() => {});
    // Delete only the fixture created by this test, guarded by its exact name.
    const fixture = await db.user.findUnique({ where: { id: user.id } });
    if (fixture?.name === name && name.startsWith('E2E Dominion ')) await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
