import "dotenv/config";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
async function chooseOption(control, value) {
  await control.click();
  await control
    .page()
    .getByRole("option")
    .and(control.page().locator(`[data-value="${value}"]`))
    .click();
}

async function enterTitle(page) {
  const enter = page.getByRole("button", {
      name: "Enter the arena",
      exact: true,
    }),
    ranked = page.getByRole("button", { name: "Play Ranked", exact: true });
  await expect(enter.or(ranked)).toBeVisible();
  if (await enter.isVisible()) await enter.click();
}

const screenshots = path.resolve("docs/screenshots");
fs.mkdirSync(screenshots, { recursive: true });
const manifest = path.resolve(".runtime/e2e-test-users.json");
function remember(user) {
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  const ids = fs.existsSync(manifest)
    ? JSON.parse(fs.readFileSync(manifest, "utf8"))
    : [];
  if (!ids.includes(user.id))
    fs.writeFileSync(manifest, JSON.stringify([...ids, user.id]));
}
function rememberTournament(id) {
  const file = path.resolve(".runtime/e2e-test-tournaments.json");
  const ids = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : [];
  if (!ids.includes(id)) fs.writeFileSync(file, JSON.stringify([...ids, id]));
}
const tag = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const board = (page) =>
  page.getByRole("group", { name: "Three by three elemental game board" });
test.beforeEach(async ({}, info) => {
  // The suite shares one localhost IP. Respect the normal public request budget
  // after collection purchase/equip checks and before heavy multiplayer flows.
  if (
    [
      "two human accounts complete",
      "guest practice, three-power",
      "friends, daily rewards",
      "direct friend invitations",
    ].some((prefix) => info.title.startsWith(prefix))
  ) {
    info.setTimeout(240_000);
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
});

async function read(page, route) {
  return page.evaluate(async (route) => {
    const response = await fetch(route, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok)
      throw new Error(`${route}: ${body.error?.message || response.status}`);
    return body;
  }, route);
}
async function session(page) {
  return (await read(page, "/api/auth/session")).user;
}
async function snapshot(page, id) {
  return read(page, `/api/matches/${id}`);
}
async function connected(page) {
  await expect(page.locator(".connection")).toHaveText("Arena connected");
}

async function register(page, name, email) {
  await page.goto("/");
  await enterTitle(page);
  await page
    .getByRole("button", { name: "Player account", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await dialog.getByLabel("Player name", { exact: true }).fill(name);
  await dialog.getByLabel("Email address", { exact: true }).fill(email);
  await dialog
    .getByLabel("Password", { exact: true })
    .fill(`Arena!${tag()}Secure`);
  const registered = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/register") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Create your account" }).click();
  const registration = await (await registered).json();
  if (registration.user?.id) remember(registration.user);
  await expect(dialog).toBeHidden();
  await connected(page);
  const user = await session(page);
  remember(user);
  expect(user.guest).toBe(false);
  expect(user.loadout).toEqual(["fire", "shield", "portal"]);
  return user;
}
async function waitRevision(pages, id, revision) {
  for (const page of pages)
    await expect
      .poll(async () => (await snapshot(page, id)).state.revision, {
        intervals: [100, 200, 400],
      })
      .toBe(revision);
}
async function place(page, pages, id, cell, revision) {
  const target = board(page).getByRole("button").nth(cell);
  await expect(target).toBeEnabled();
  await target.click();
  await waitRevision(pages, id, revision + 1);
}
async function cast(page, pages, id, power, cell, revision) {
  await page
    .locator(".power-toolbar")
    .getByRole("button", { name: new RegExp(power) })
    .click();
  const target = board(page).getByRole("button").nth(cell);
  await expect(target).toBeEnabled();
  await target.click();
  await waitRevision(pages, id, revision + 1);
}
async function surrender(page) {
  await page.getByRole("button", { name: "Battle menu", exact: true }).click();
  await page
    .locator(".battle-controls")
    .getByRole("button", { name: "Surrender", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Leave this battle?" })
    .getByRole("button", { name: "Surrender", exact: true })
    .click();
  await expect(page.locator(".result-panel")).toBeVisible();
}

test("two human accounts complete ranked play with synchronized powers, cups and replay", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextOptions = {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  };
  const contexts = await Promise.all([
    browser.newContext(contextOptions),
    browser.newContext(contextOptions),
  ]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [a, b] = pages;
  const id = tag();
  let matchId;
  try {
    const userA = await register(
      a,
      `E2E A ${id}`.slice(0, 20),
      `arena-e2e-${id}-a@example.test`,
    );
    const userB = await register(
      b,
      `E2E B ${id}`.slice(0, 20),
      `arena-e2e-${id}-b@example.test`,
    );
    await a.getByRole("button", { name: "Play Ranked", exact: true }).click();
    await expect(
      a.getByRole("dialog", { name: "Finding your next rival" }),
    ).toBeVisible();
    expect((await read(a, "/api/queue")).queued).toBe(true);
    await b.getByRole("button", { name: "Play Ranked", exact: true }).click();
    for (const page of pages) {
      await expect(page).toHaveURL(/\/battle$/);
      await expect(board(page).getByRole("button")).toHaveCount(9);
    }
    const initial = (await read(a, "/api/matches/active")).match;
    expect(initial.mode).toBe("ranked");
    expect(initial.participants.every((player) => !player.isAI)).toBe(true);
    expect(initial.participants.map((player) => player.userId).sort()).toEqual(
      [userA.id, userB.id].sort(),
    );
    expect(initial.state.turnSeconds).toBe(20);
    expect(
      initial.state.players.every((player) => player.loadout.length === 3),
    ).toBe(true);
    matchId = initial.matchId;
    expect((await read(b, "/api/matches/active")).match.matchId).toBe(matchId);
    const first = initial.state.currentPlayerId === userA.id ? a : b;
    const second = first === a ? b : a;
    const firstId = initial.state.currentPlayerId;
    const secondId = initial.state.players.find(
      (player) => player.id !== firstId,
    ).id;
    await place(first, pages, matchId, 0, 0);
    await place(second, pages, matchId, 4, 1);
    await cast(first, pages, matchId, "Shield Guard", 0, 2);
    for (const page of pages)
      await expect(board(page).getByRole("button").nth(0)).toHaveAttribute(
        "aria-label",
        /shielded/,
      );
    await place(second, pages, matchId, 8, 3);
    await cast(first, pages, matchId, "Fire Blast", 4, 4);
    const powered = await snapshot(a, matchId);
    expect(powered.state.board[0]).toBe(firstId);
    expect(powered.state.board[4]).toBeNull();
    expect(powered.state.board[8]).toBe(secondId);
    expect(powered.state.uses[firstId].shield).toBe(1);
    expect(powered.state.uses[firstId].fire).toBe(1);
    await a.screenshot({
      path: path.join(screenshots, "ranked-battle-desktop.png"),
      fullPage: true,
    });
    await surrender(a);
    await expect(b.locator(".result-panel")).toBeVisible();
    await expect(b.locator(".result-panel")).toContainText("VICTORY");
    await expect
      .poll(async () => (await session(b)).cups)
      .toBe(userB.cups + 20);
    expect((await session(a)).cups).toBe(0);
    const final = await snapshot(b, matchId);
    expect(final.state.status).toBe("finished");
    expect(final.state.matchWinnerId).toBe(userB.id);
    expect(final.settlement.settled).toBe(true);
    expect(
      final.settlement.participants.find((player) => player.id === userB.id)
        .cupChange,
    ).toBe(20);
    await b.getByRole("button", { name: "View replay" }).click();
    await expect(b).toHaveURL(new RegExp(`/replay/${matchId}$`));
    await expect(
      b.getByRole("button", { name: "Next action", exact: true }),
    ).toBeEnabled();
    await b.getByRole("button", { name: "Next action", exact: true }).click();
    await expect(b.locator(".replay-caption")).toContainText("Action 1");
    await b.getByRole("tab", { name: "Every action", exact: true }).click();
    await b.getByRole("button", { name: /^Inspect action 2:/ }).click();
    await expect(b.locator(".replay-caption")).toContainText("Action 2");
    await b
      .getByRole("tab", { name: "Tactical highlights", exact: true })
      .click();
    await expect(
      b.getByRole("tab", { name: "Tactical highlights", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await b.getByRole("button", { name: "Journey", exact: true }).click();
    await b.getByRole("button", { name: "Leaderboards", exact: true }).click();
    const ownProfile = b
      .getByRole("button", {
        name: `View ${userB.name}'s profile`,
        exact: true,
      })
      .first();
    await expect(ownProfile).toBeVisible();
    const standings = await read(b, "/api/leaderboard?limit=100");
    expect(
      standings.entries.find((player) => player.id === userB.id).cups,
    ).toBe(20);
    await b.screenshot({
      path: path.join(screenshots, "leaderboard-desktop.png"),
      fullPage: true,
    });
    await b.getByRole("combobox", { name: "Ranking", exact: true }).click();
    await b.getByRole("option", { name: "Weekly victories", exact: true }).click();
    await expect(ownProfile).toBeVisible();
    await b.getByRole("tab", { name: "Season", exact: true }).click();
    await expect(
      b.getByRole("combobox", { name: "Competitive season", exact: true }),
    ).toBeVisible();
    await expect(ownProfile).toBeVisible();
    await ownProfile.click();
    await expect(b).toHaveURL(new RegExp(`/players/${userB.id}$`));
    await expect(
      b.getByRole("heading", { name: userB.name, exact: true }),
    ).toBeVisible();
    await b
      .getByRole("button", { name: "Edit my profile", exact: true })
      .click();
    await b
      .getByRole("textbox", { name: "Player bio", exact: true })
      .fill("A patient challenger who guards the center.");
    await b
      .getByRole("textbox", { name: "Country or region", exact: true })
      .fill("IN");
    await b.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(b.getByRole("status")).toContainText("identity is saved");
    await b.reload();
    await connected(b);
    await expect(
      b.getByRole("textbox", { name: "Player bio", exact: true }),
    ).toHaveValue("A patient challenger who guards the center.");
    expect((await session(b)).profile.region).toBe("IN");
    await b.getByRole("button", { name: "Journey", exact: true }).click();
    await b.getByRole("button", { name: "Leaderboards", exact: true }).click();
    await b.getByRole("tab", { name: "Country / region", exact: true }).click();
    await expect(ownProfile).toBeVisible();
    await expect(
      b.getByRole("combobox", { name: "Country or region", exact: true }),
    ).toHaveAttribute("data-value", "IN");
    await b.getByRole("button", { name: "Cosmetic shop", exact: true }).click();
    await connected(b);
    // Premium collections fill the first featured page; find the item by name.
    await b
      .getByLabel("Search cosmetics", { exact: true })
      .fill("Ember Sovereign");
    const ember = b.locator(".shop-card").filter({
      has: b.getByRole("heading", { name: "Ember Sovereign", exact: true }),
    });
    await ember.getByRole("button", { name: /350 coins/ }).click();
    await expect(b.getByRole("status")).toContainText(
      "added to your collection",
    );
    await b.getByRole("button", { name: "Journey", exact: true }).click();
    await b.getByRole("button", { name: "Inventory", exact: true }).click();
    await connected(b);
    const ownedEmber = b.locator(".shop-card").filter({
      has: b.getByRole("heading", { name: "Ember Sovereign", exact: true }),
    });
    await ownedEmber
      .getByRole("button", { name: "Equip cosmetic", exact: true })
      .click();
    await expect(
      ownedEmber.getByRole("button", { name: "Equipped", exact: true }),
    ).toBeDisabled();
    expect((await session(b)).profile.avatar).toBe("avatar-ember");
    await expect(
      b.locator('[aria-label="Player account"] img'),
    ).toHaveAttribute("src", "/assets/avatar-fire.webp");
    expect((await session(b)).loadout).toEqual(userB.loadout);
    await b
      .getByRole("button", { name: "Player account", exact: true })
      .click();
    await b.getByRole("tab", { name: "Equipped style", exact: true }).click();
    const equippedAvatar = b.getByRole("combobox", {
      name: "Equipped avatar",
      exact: true,
    });
    await chooseOption(equippedAvatar, "avatar-void");
    await expect
      .poll(async () => (await session(b)).profile.avatar)
      .toBe("avatar-void");
    await expect(equippedAvatar).toBeEnabled();
    await chooseOption(equippedAvatar, "avatar-ember");
    await expect
      .poll(async () => (await session(b)).profile.avatar)
      .toBe("avatar-ember");
    await expect(
      b.locator('[aria-label="Player account"] img'),
    ).toHaveAttribute("src", "/assets/avatar-fire.webp");
    if (process.env.DATABASE_URL && process.env.E2E_SKIP_ADMIN !== "1") {
      // A real local administrator fixture: no API bypass or mocked response is used for operations.
      const { PrismaClient } = await import("@prisma/client");
      const db = new PrismaClient();
      try {
        const promoted = await db.user.updateMany({
          where: { id: userA.id, email: userA.email },
          data: { role: "ADMIN" },
        });
        expect(promoted.count).toBe(1);
      } finally {
        await db.$disconnect();
      }
      await a.goto("/admin");
      await connected(a);
      const admin = a.getByRole("region", { name: "Arena administration" });
      await expect(
        admin.getByRole("heading", { name: "Arena control", exact: true }),
      ).toBeVisible();
      await admin
        .getByRole("navigation", { name: "Administration sections" })
        .getByRole("button", { name: "Tournaments", exact: true })
        .click();
      const tournamentName = `E2E Cup ${id}`;
      await admin.getByLabel("Name", { exact: true }).fill(tournamentName);
      // Keep the scheduled auto-start in the future so this flow tests the explicit admin action.
      const scheduled = new Date(Date.now() + 3_600_000);
      const localStart = new Date(
        scheduled.getTime() - scheduled.getTimezoneOffset() * 60_000,
      )
        .toISOString()
        .slice(0, 16);
      await admin.getByLabel("Start time", { exact: true }).fill(localStart);
      await admin
        .getByRole("combobox", { name: "Bracket size", exact: true })
        .selectOption("2");
      await admin
        .getByRole("button", { name: "Create tournament", exact: true })
        .click();
      await expect(
        admin.getByRole("status").filter({ hasText: "Tournament created" }),
      ).toBeVisible();
      const tournament = (await read(a, "/api/tournaments")).tournaments.find(
        (item) => item.name === tournamentName,
      );
      expect(tournament).toBeTruthy();
      rememberTournament(tournament.id);
      for (const page of pages) {
        await page.goto(`/tournaments/${tournament.id}`);
        await connected(page);
        await page
          .getByRole("region", { name: "Tournament details" })
          .getByRole("button", { name: "Register", exact: true })
          .click();
        await expect(
          page
            .getByRole("region", { name: "Tournament details" })
            .getByRole("button", { name: "You are registered", exact: true }),
        ).toBeDisabled();
      }
      const bracket = a.getByRole("region", { name: "Tournament details" });
      await bracket
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await expect(
        bracket.getByRole("button", { name: "Start bracket", exact: true }),
      ).toBeEnabled();
      await bracket
        .getByRole("button", { name: "Start bracket", exact: true })
        .click();
      for (const page of pages) await expect(board(page)).toBeVisible();
      const tournamentMatch = (await read(a, "/api/matches/active")).match;
      matchId = tournamentMatch.matchId;
      expect(tournamentMatch.mode).toBe("tournament");
      await surrender(a);
      await expect
        .poll(
          async () =>
            (await read(b, `/api/tournaments/${tournament.id}`)).tournament
              .status,
        )
        .toBe("finished");
      const finishedCup = (await read(b, `/api/tournaments/${tournament.id}`))
        .tournament;
      expect(finishedCup.rounds[0].matches[0].winnerId).toBe(userB.id);
      expect((await session(b)).cups).toBe(20);
      await b.goto(`/tournaments/${tournament.id}`);
      await expect(
        b.getByRole("region", { name: "Tournament details" }),
      ).toContainText("TOURNAMENT CHAMPION");
      await b.screenshot({
        path: path.join(screenshots, "tournament-finished-desktop.png"),
        fullPage: true,
      });
      await a.goto("/admin");
      await connected(a);
      await a
        .getByRole("navigation", { name: "Administration sections" })
        .getByRole("button", { name: "Audit log", exact: true })
        .click();
      await expect(
        a.getByText("tournament started", { exact: true }).first(),
      ).toBeVisible();
    }
    await b.setViewportSize({ width: 390, height: 844 });
    await b.goto("/");
    await expect(
      b.getByRole("button", { name: "Play Ranked", exact: true }),
    ).toBeVisible();
    expect(
      await b.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await b.screenshot({
      path: path.join(screenshots, "lobby-mobile.png"),
      fullPage: true,
    });
  } finally {
    // Finish an interrupted test match through the real API so a retry never strands an account.
    if (matchId)
      try {
        await a.evaluate(async (matchId) => {
          await fetch(`/api/matches/${matchId}/surrender`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: crypto.randomUUID() }),
          });
        }, matchId);
      } catch {}
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("guest practice, three-power loadout, persisted settings and cosmetic purchases use real services", async ({
  page,
}) => {
  const id = tag();
  await page.goto("/");
  await enterTitle(page);
  await page
    .getByRole("button", { name: "Player account", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Play as guest", exact: true })
    .click();
  await dialog
    .getByLabel("Player name", { exact: true })
    .fill(`E2E Guest ${id}`.slice(0, 20));
  await dialog.getByRole("button", { name: "Enter as a guest" }).click();
  await expect(dialog).toBeHidden();
  await connected(page);
  const guest = await session(page);
  remember(guest);
  expect(guest.guest).toBe(true);

  await page
    .getByRole("button", { name: "Powers & loadout", exact: true })
    .click();
  await connected(page);
  await page
    .locator(".power-card")
    .filter({
      has: page.getByRole("heading", { name: "Portal Shift", exact: true }),
    })
    .click();
  await expect(page.locator(".loadout-summary")).toContainText(
    "2 / 3 equipped",
  );
  await page
    .locator(".power-card")
    .filter({
      has: page.getByRole("heading", { name: "Ice Freeze", exact: true }),
    })
    .click();
  await expect(page.locator(".loadout-summary")).toContainText(
    "3 / 3 equipped",
  );
  await expect(
    page.locator(".power-card").filter({
      has: page.getByRole("heading", { name: "Ice Freeze", exact: true }),
    }),
  ).toHaveClass(/equipped/);
  await page.getByRole("button", { name: "Save loadout", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "three powers are equipped",
  );
  expect((await session(page)).loadout).toEqual(["fire", "shield", "ice"]);

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics/Motion", exact: true }).click();
  const motionSwitch = page.getByRole("switch", {
    name: "Reduced motion",
    exact: true,
  });
  const contrastSwitch = page.getByRole("switch", {
    name: "High contrast",
    exact: true,
  });
  if ((await motionSwitch.getAttribute("aria-checked")) !== "true")
    await motionSwitch.click();
  await expect(motionSwitch).toHaveAttribute("aria-checked", "true");
  if ((await contrastSwitch.getAttribute("aria-checked")) !== "true")
    await contrastSwitch.click();
  await expect(contrastSwitch).toHaveAttribute("aria-checked", "true");
  await expect(motionSwitch).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("status")).toContainText("Settings saved");
  await expect
    .poll(async () => (await session(page)).settings.reducedMotion)
    .toBe(true);
  expect((await session(page)).settings.highContrast).toBe(true);
  await expect(page.locator(".app-shell")).toHaveClass(/reduce-motion/);
  await expect(page.locator(".app-shell")).toHaveClass(/high-contrast/);

  if (
    await page
      .getByRole("dialog", { name: "Settings", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Close Settings", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Cosmetic shop", exact: true })
    .click();
  const title = page.locator(".shop-card").filter({
    has: page.getByRole("heading", { name: "The Strategist", exact: true }),
  });
  await title.getByRole("button", { name: /250 coins/ }).click();
  await expect(page.getByRole("status")).toContainText(
    "added to your collection",
  );
  const inventory = await read(page, "/api/inventory");
  expect(
    inventory.inventory.some((item) => item.cosmeticId === "title-strategist"),
  ).toBe(true);
  expect((await session(page)).coins).toBe(guest.coins - 250);
  await page.getByRole("button", { name: "Journey", exact: true }).click();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await connected(page);
  const ownedTitle = page.locator(".shop-card").filter({
    has: page.getByRole("heading", { name: "The Strategist", exact: true }),
  });
  await ownedTitle
    .getByRole("button", { name: "Equip cosmetic", exact: true })
    .click();
  await expect(
    ownedTitle.getByRole("button", { name: "Equipped", exact: true }),
  ).toBeDisabled();
  expect((await session(page)).profile.title).toBe("The Strategist");
  expect((await session(page)).loadout).toEqual(["fire", "shield", "ice"]);

  await page
    .getByRole("button", { name: "Elemental Arena home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select battle mode", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Choose your battle", exact: true })
    .getByRole("button", { name: "Practice Arena", exact: true })
    .click();
  const practice = page.getByRole("dialog", { name: "Sharpen your next move" });
  await practice.getByRole("button", { name: "Beginner", exact: true }).click();
  await practice.getByRole("button", { name: "Enter Practice Arena" }).click();
  await expect(page).toHaveURL(/\/battle$/);
  await expect(board(page)).toBeVisible();
  const match = (await read(page, "/api/matches/active")).match;
  expect(match.mode).toBe("ai");
  expect(match.difficulty).toBe("beginner");
  expect(match.participants.filter((player) => player.isAI)).toHaveLength(1);
  expect(
    match.state.players.find((player) => player.id === guest.id).loadout,
  ).toEqual(["fire", "shield", "ice"]);
  await expect(page.locator(".turn-banner .your-turn")).toBeVisible();
  const before = await snapshot(page, match.matchId);
  const empty = before.state.board.findIndex((cell) => cell === null);
  await board(page).getByRole("button").nth(empty).click();
  await expect
    .poll(async () => (await snapshot(page, match.matchId)).state.revision)
    .toBeGreaterThan(before.state.revision);
  await expect
    .poll(async () =>
      (await snapshot(page, match.matchId)).state.history.some(
        (action) => action.playerId !== guest.id,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(screenshots, "ai-practice-desktop.png"),
    fullPage: true,
  });
  await surrender(page);
  expect((await session(page)).cups).toBe(guest.cups);
  const settled = await snapshot(page, match.matchId);
  expect(
    settled.settlement.participants.find((player) => player.id === guest.id)
      .cupChange,
  ).toBe(0);
});

test("friends, daily rewards, private classic play, reconnect, emotes and rematches persist", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const options = {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  };
  const contexts = await Promise.all([
    browser.newContext(options),
    browser.newContext(options),
  ]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [a, b] = pages;
  const id = tag();
  let matchId;
  try {
    const userA = await register(
      a,
      `E2E Friend A ${id}`.slice(0, 20),
      `arena-e2e-${id}-friend-a@example.test`,
    );
    const userB = await register(
      b,
      `E2E Friend B ${id}`.slice(0, 20),
      `arena-e2e-${id}-friend-b@example.test`,
    );
    await a.getByRole("button", { name: "Friends", exact: true }).click();
    await a
      .getByRole("textbox", { name: "Player name", exact: true })
      .fill(userB.name);
    await a.getByRole("button", { name: "Send request", exact: true }).click();
    await expect(a.getByRole("status")).toContainText("Friend request sent");
    await b.getByRole("button", { name: "Friends", exact: true }).click();
    await b
      .getByRole("navigation", { name: "Social sections", exact: true })
      .getByRole("button", { name: /^Requests/ })
      .click();
    const request = b
      .locator("article")
      .filter({ hasText: `${userA.name} wants to be friends` });
    await request.getByRole("button", { name: "Accept", exact: true }).click();
    await expect
      .poll(async () =>
        (await read(a, "/api/friends")).friends.some(
          (friend) => friend.id === userB.id,
        ),
      )
      .toBe(true);
    expect(
      (await read(b, "/api/friends")).friends.find(
        (friend) => friend.id === userA.id,
      ).online,
    ).toBe(true);

    await b.getByRole("button", { name: "Notifications", exact: true }).click();
    await expect(
      b.locator(".notification-row").filter({ hasText: userA.name }),
    ).toBeVisible();
    await b.getByRole("button", { name: "Mark all read", exact: true }).click();
    await expect
      .poll(async () =>
        (await read(b, "/api/notifications")).notifications.every(
          (notification) => !!notification.readAt,
        ),
      )
      .toBe(true);
    await a.getByRole("button", { name: "Journey", exact: true }).click();
    await a
      .getByRole("button", { name: "Missions & rewards", exact: true })
      .click();
    const initialCoins = (await session(a)).coins;
    await a
      .getByRole("button", { name: "Claim daily reward", exact: true })
      .click();
    await expect(
      a.getByRole("button", { name: "Claimed today", exact: true }),
    ).toBeDisabled();
    expect((await session(a)).coins).toBe(initialCoins + 40);
    await a.reload();
    await connected(a);
    await expect(
      a.getByRole("button", { name: "Claimed today", exact: true }),
    ).toBeDisabled();

    for (const page of pages)
      await page
        .getByRole("button", { name: "Elemental Arena home", exact: true })
        .click();
    await a
      .getByRole("button", { name: "Select battle mode", exact: true })
      .click();
    await a
      .getByRole("dialog", { name: "Choose your battle", exact: true })
      .getByRole("button", { name: "Challenge a Friend", exact: true })
      .click();
    const create = a.getByRole("dialog", { name: "A friendly rivalry" });
    await create.getByRole("button", { name: "Classic", exact: true }).click();
    await create
      .getByRole("button", { name: "Create a room", exact: true })
      .click();
    const waiting = a.getByRole("dialog", {
      name: "Your rival is one code away",
    });
    const roomCode = (await waiting.locator(".room-code").textContent()).trim();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    await b
      .getByRole("button", { name: "Select battle mode", exact: true })
      .click();
    await b
      .getByRole("dialog", { name: "Choose your battle", exact: true })
      .getByRole("button", { name: "Challenge a Friend", exact: true })
      .click();
    const join = b.getByRole("dialog", { name: "A friendly rivalry" });
    await join
      .getByRole("textbox", { name: "Room code", exact: true })
      .fill(roomCode);
    await join.getByRole("button", { name: "Join room", exact: true }).click();
    for (const page of pages) await expect(board(page)).toBeVisible();
    const initial = (await read(a, "/api/matches/active")).match;
    matchId = initial.matchId;
    expect(initial.mode).toBe("friend");
    expect(initial.ruleset).toBe("classic");
    expect(initial.state.maxRounds).toBe(1);
    expect(initial.participants.every((participant) => !participant.isAI)).toBe(
      true,
    );
    const first = initial.state.currentPlayerId === userA.id ? a : b;
    const second = first === a ? b : a;
    const firstId = initial.state.currentPlayerId;
    await board(first).getByRole("button").nth(0).focus();
    await board(first).getByRole("button").nth(0).press("Enter");
    await waitRevision(pages, matchId, 1);
    await second
      .getByRole("button", { name: "Match emotes", exact: true })
      .click();
    await second
      .getByRole("dialog", { name: "Match emotes", exact: true })
      .getByRole("button", { name: "Nice move!", exact: true })
      .click();
    await expect(first.locator(".battle-status")).toContainText("Nice move!");
    await second.reload();
    await connected(second);
    await expect(board(second).getByRole("button").nth(0)).toHaveAttribute(
      "aria-label",
      /: X$/,
    );
    const resumed = await snapshot(second, matchId);
    expect(resumed.state.revision).toBe(1);
    expect(resumed.state.board[0]).toBe(firstId);
    await place(second, pages, matchId, 4, 1);
    await place(first, pages, matchId, 1, 2);
    await place(second, pages, matchId, 8, 3);
    await place(first, pages, matchId, 2, 4);
    for (const page of pages)
      await expect(page.locator(".result-panel")).toBeVisible();
    expect((await snapshot(a, matchId)).state.matchWinnerId).toBe(firstId);
    expect((await session(a)).cups).toBe(0);
    expect((await session(b)).cups).toBe(0);
    await a.screenshot({
      path: path.join(screenshots, "private-match-result-desktop.png"),
      fullPage: true,
    });

    await a
      .locator(".result-panel")
      .getByRole("button", { name: "Play again", exact: true })
      .click();
    await expect(a.getByRole("status")).toContainText("Rematch requested");
    await b
      .locator(".result-panel")
      .getByRole("button", { name: "Accept rematch", exact: true })
      .click();
    await expect
      .poll(async () => {
        const current = (await read(a, "/api/matches/active")).match;
        return Boolean(current?.matchId && current.matchId !== matchId);
      })
      .toBe(true);
    const rematch = (await read(a, "/api/matches/active")).match;
    expect(rematch.mode).toBe("friend");
    expect(rematch.ruleset).toBe("classic");
    expect(rematch.state.board.every((cell) => cell === null)).toBe(true);
    matchId = rematch.matchId;
    await surrender(a);
    await expect(b.locator(".result-panel")).toBeVisible();
    expect((await session(a)).cups).toBe(0);
    expect((await session(b)).cups).toBe(0);
    await a.getByRole("button", { name: "Friends", exact: true }).click();
    await a
      .getByRole("button", { name: `Remove ${userB.name}`, exact: true })
      .click();
    await expect
      .poll(async () => (await read(b, "/api/friends")).friends.length)
      .toBe(0);

    await a.getByRole("button", { name: "Journey", exact: true }).click();
    await a.getByRole("button", { name: "Daily puzzle", exact: true }).click();
    const puzzle = a.locator(".puzzle-panel");
    await expect(
      puzzle.getByRole("button", { name: /^Puzzle row/ }),
    ).toHaveCount(9);
    const labels = await puzzle
      .getByRole("button", { name: /^Puzzle row/ })
      .evaluateAll((cells) =>
        cells.map((cell) => cell.getAttribute("aria-label").split(": ")[1]),
      );
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    const winningCell = labels.findIndex(
      (mark, index) =>
        mark === "empty" &&
        lines.some((line) =>
          line.every((cell) => cell === index || labels[cell] === "X"),
        ),
    );
    expect(winningCell).toBeGreaterThanOrEqual(0);
    await puzzle
      .getByRole("button", { name: /^Puzzle row/ })
      .nth(winningCell)
      .click();
    await expect(puzzle.locator(".puzzle-feedback")).toContainText(
      "A winning move",
    );
    expect((await session(a)).cups).toBe(0);
    await a.screenshot({
      path: path.join(screenshots, "daily-puzzle-desktop.png"),
      fullPage: true,
    });
  } finally {
    if (matchId)
      try {
        await a.evaluate(async (matchId) => {
          await fetch(`/api/matches/${matchId}/surrender`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: crypto.randomUUID() }),
          });
        }, matchId);
      } catch {}
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("local classic reloads and plays with the browser network offline", async ({
  page,
  context,
}) => {
  await page.goto("/local-play");
  const local = page.getByRole("region", { name: "Local classic arena" });
  await expect(local).toBeVisible();
  await expect(local.getByRole("status")).toHaveText(
    "Available offline on this browser",
    { timeout: 30_000 },
  );
  const cachedPaths = await page.evaluate(async () =>
    (await (await caches.open("elemental-arena-local-classic-v2")).keys()).map(
      (request) => new URL(request.url).pathname,
    ),
  );
  expect(cachedPaths).toContain("/local-play");
  expect(
    cachedPaths.every(
      (route) => !route.startsWith("/api/") && !route.startsWith("/socket.io/"),
    ),
  ).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(local).toBeVisible();
    const localBoard = local.getByRole("group", {
      name: "Local three by three classic board",
    });
    await expect(localBoard.getByRole("button")).toHaveCount(9);
    for (const cell of [0, 4, 1, 8, 2])
      await localBoard.getByRole("button").nth(cell).click();
    await expect(local).toContainText("Player X wins as X");
    await expect(localBoard.getByRole("button").nth(2)).toBeDisabled();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("elemental-arena-local-classic-v1")),
    );
    expect(saved.game.status).toBe("finished");
    expect(saved.game.matchWinnerId).toBe("local-x");
    expect(saved.score.X).toBe(1);
    await page.reload();
    await expect(local).toContainText("Player X wins as X");
    await local
      .getByRole("button", { name: "New local game", exact: true })
      .click();
    await expect(
      localBoard.getByRole("button", { name: /empty$/ }),
    ).toHaveCount(9);
    await local
      .getByRole("button", { name: "Local options", exact: false })
      .click();
    await chooseOption(
      page
        .getByRole("dialog", { name: "Your local arena" })
        .getByRole("combobox", { name: "Local game opponent", exact: true }),
      "ai",
    );
    await chooseOption(
      page
        .getByRole("dialog", { name: "Your local arena" })
        .getByRole("combobox", { name: "AI difficulty", exact: true }),
      "Nightmare",
    );
    await page
      .getByRole("dialog", { name: "Your local arena" })
      .getByRole("button", { name: "PLAY", exact: true })
      .click();
    await localBoard.getByRole("button").nth(0).click();
    await expect
      .poll(async () =>
        localBoard.getByRole("button", { name: /: O$/ }).count(),
      )
      .toBe(1);
    await expect(local).toContainText("You · X to move");
    const aiGame = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("elemental-arena-local-classic-v1")),
    );
    expect(aiGame.game.revision).toBe(2);
    expect(aiGame.config.difficulty).toBe("Nightmare");
    await page.screenshot({
      path: path.join(screenshots, "offline-classic-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});

test("direct friend invitations allow a read-only spectator and block controls prevent requests", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const options = {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  };
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () => browser.newContext(options)),
  );
  const [a, b, viewer] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  const id = tag();
  let matchId;
  try {
    const userA = await register(
      a,
      `E2E Invite A ${id}`.slice(0, 20),
      `arena-e2e-${id}-invite-a@example.test`,
    );
    const userB = await register(
      b,
      `E2E Invite B ${id}`.slice(0, 20),
      `arena-e2e-${id}-invite-b@example.test`,
    );
    await register(
      viewer,
      `E2E Viewer ${id}`.slice(0, 20),
      `arena-e2e-${id}-viewer@example.test`,
    );
    await a.getByRole("button", { name: "Friends", exact: true }).click();
    await a
      .getByRole("textbox", { name: "Player name", exact: true })
      .fill(userB.name);
    await a.getByRole("button", { name: "Send request", exact: true }).click();
    await expect(a.getByRole("status")).toContainText("Friend request sent");
    await b.getByRole("button", { name: "Friends", exact: true }).click();
    const social = (page) =>
      page.getByRole("navigation", { name: "Social sections", exact: true });
    await social(b)
      .getByRole("button", { name: /^Requests/ })
      .click();
    await b
      .locator("article")
      .filter({ hasText: `${userA.name} wants to be friends` })
      .getByRole("button", { name: "Accept", exact: true })
      .click();
    await a
      .getByRole("button", { name: "Refresh friends", exact: true })
      .click();
    await a
      .locator("article")
      .filter({ hasText: userB.name })
      .getByRole("button", { name: "Challenge", exact: true })
      .click();
    const room = a.getByRole("dialog", { name: "Your rival is one code away" });
    const roomCode = (await room.locator(".room-code").textContent()).trim();
    await social(b)
      .getByRole("button", { name: /^Invitations/ })
      .click();
    await b
      .getByRole("button", { name: "Refresh friends", exact: true })
      .click();
    await b
      .getByRole("button", { name: "Accept challenge", exact: true })
      .click();
    for (const page of [a, b]) await expect(board(page)).toBeVisible();
    const initial = (await read(a, "/api/matches/active")).match;
    matchId = initial.matchId;
    expect(initial.mode).toBe("friend");
    await viewer.goto(`/invite/${roomCode}`);
    await connected(viewer);
    const join = viewer.getByRole("dialog", { name: "A friendly rivalry" });
    await expect(
      join.getByRole("textbox", { name: "Room code", exact: true }),
    ).toHaveValue(roomCode);
    await join.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(board(viewer)).toBeVisible();
    await expect(
      viewer.getByText("SPECTATING", { exact: false }).first(),
    ).toBeVisible();
    expect((await snapshot(viewer, matchId)).spectator).toBe(true);
    expect(
      await board(viewer)
        .getByRole("button")
        .evaluateAll((cells) => cells.every((cell) => cell.disabled)),
    ).toBe(true);
    await expect(viewer.locator(".power-toolbar")).toHaveCount(0);
    const actor = initial.state.currentPlayerId === userA.id ? a : b;
    await place(actor, [a, b, viewer], matchId, 0, 0);
    await expect(board(viewer).getByRole("button").nth(0)).toHaveAttribute(
      "aria-label",
      /: X$/,
    );
    await viewer.screenshot({
      path: path.join(screenshots, "spectator-desktop.png"),
      fullPage: true,
    });
    await surrender(a);
    await expect(b.locator(".result-panel")).toBeVisible();
    expect((await session(a)).cups).toBe(0);
    expect((await session(b)).cups).toBe(0);

    await a.getByRole("button", { name: "Friends", exact: true }).click();
    await a
      .locator("article")
      .filter({ hasText: userB.name })
      .getByRole("button", { name: "Block", exact: true })
      .click();
    await expect(a.getByRole("status")).toContainText("blocked");
    await expect
      .poll(async () =>
        (await read(a, "/api/friends")).blocks.some(
          (block) => block.blockedId === userB.id,
        ),
      )
      .toBe(true);
    await b.getByRole("button", { name: "Friends", exact: true }).click();
    await b
      .getByRole("textbox", { name: "Player name", exact: true })
      .fill(userA.name);
    await b.getByRole("button", { name: "Send request", exact: true }).click();
    // Blocked identities are hidden by search instead of revealing the block relationship.
    await expect(b.getByRole("status")).toContainText(
      "No matching players were found",
    );
    expect(
      (await read(b, "/api/friends")).requests.some(
        (request) =>
          request.senderId === userB.id && request.receiverId === userA.id,
      ),
    ).toBe(false);
    await social(a)
      .getByRole("button", { name: /^Blocked/ })
      .click();
    await a
      .getByRole("button", { name: "Unblock player", exact: true })
      .click();
    await expect
      .poll(async () => (await read(a, "/api/friends")).blocks.length)
      .toBe(0);
    await b.getByRole("button", { name: "Send request", exact: true }).click();
    await expect(b.getByRole("status")).toContainText("Friend request sent");
    await a
      .getByRole("button", { name: "Refresh friends", exact: true })
      .click();
    await social(a)
      .getByRole("button", { name: /^Requests/ })
      .click();
    await a
      .locator("article")
      .filter({ hasText: `${userB.name} wants to be friends` })
      .getByRole("button", { name: "Reject", exact: true })
      .click();
    await expect(a.getByRole("status")).toContainText("declined");
    expect((await read(a, "/api/friends")).friends).toHaveLength(0);
  } finally {
    if (matchId)
      try {
        await a.evaluate(async (matchId) => {
          await fetch(`/api/matches/${matchId}/surrender`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: crypto.randomUUID() }),
          });
        }, matchId);
      } catch {}
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("guided tutorial demonstrates real wins, shield counterplay and portal movement", async ({
  page,
}) => {
  await page.goto("/tutorial");
  const tutorial = page.getByRole("region", {
    name: "Interactive arena tutorial",
    exact: true,
  });
  const trainingBoard = tutorial.getByRole("group", {
    name: "Tutorial board",
    exact: true,
  });
  await expect(trainingBoard.getByRole("button")).toHaveCount(9);
  await trainingBoard.getByRole("button").nth(2).click();
  await expect(tutorial).toContainText(
    "A winning line. You saw the next move.",
  );
  await tutorial
    .getByRole("button", { name: "Next lesson", exact: true })
    .click();
  await trainingBoard.getByRole("button").nth(0).click();
  await expect(tutorial).toContainText(
    "Fire broke the shield. Your X survived.",
  );
  await expect(trainingBoard.getByRole("button").nth(0)).toHaveAttribute(
    "aria-label",
    /: X$/,
  );
  await tutorial
    .getByRole("button", { name: "Next lesson", exact: true })
    .click();
  await trainingBoard.getByRole("button").nth(8).click();
  await expect(tutorial).toContainText("Choose the top-right destination.");
  await trainingBoard.getByRole("button").nth(2).click();
  await expect(trainingBoard.getByRole("button").nth(8)).toHaveAttribute(
    "aria-label",
    /: empty$/,
  );
  await expect(trainingBoard.getByRole("button").nth(2)).toHaveAttribute(
    "aria-label",
    /: X$/,
  );
  await expect(tutorial).toContainText(
    "A winning line. You saw the next move.",
  );
  await page.screenshot({
    path: path.join(screenshots, "tutorial-desktop.png"),
    fullPage: true,
  });
  await tutorial
    .getByRole("button", { name: "Enter the Arena", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Play Ranked", exact: true }),
  ).toBeVisible();
});

test("quick match pairs real players without changing ranked cups", async ({
  browser,
}) => {
  const options = {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  };
  const contexts = await Promise.all([
    browser.newContext(options),
    browser.newContext(options),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [a, b] = pages;
  const id = tag();
  let matchId;
  try {
    const userA = await register(
      a,
      ("E2E Quick A " + id).slice(0, 20),
      "arena-e2e-" + id + "-quick-a@example.test",
    );
    const userB = await register(
      b,
      ("E2E Quick B " + id).slice(0, 20),
      "arena-e2e-" + id + "-quick-b@example.test",
    );
    await a
      .getByRole("button", { name: "Select battle mode", exact: true })
      .click();
    await a
      .getByRole("dialog", { name: "Choose your battle", exact: true })
      .getByRole("button", { name: "Quick Match", exact: true })
      .click();
    await expect(
      a.getByRole("dialog", { name: "Choose your battle", exact: true }),
    ).toBeHidden();
    await a.getByRole("button", { name: "Quick Match", exact: true }).click();
    await expect(
      a.getByRole("dialog", { name: "Finding your next rival" }),
    ).toBeVisible();
    await b
      .getByRole("button", { name: "Select battle mode", exact: true })
      .click();
    await b
      .getByRole("dialog", { name: "Choose your battle", exact: true })
      .getByRole("button", { name: "Quick Match", exact: true })
      .click();
    await expect(
      b.getByRole("dialog", { name: "Choose your battle", exact: true }),
    ).toBeHidden();
    await b.getByRole("button", { name: "Quick Match", exact: true }).click();
    await expect(board(a)).toBeVisible();
    await expect(board(b)).toBeVisible();
    const active = (await read(a, "/api/matches/active")).match;
    matchId = active.matchId;
    expect(active.mode).toBe("quick");
    expect(active.participants.map((p) => p.userId).sort()).toEqual(
      [userA.id, userB.id].sort(),
    );
    expect(active.participants.every((p) => !p.isAI)).toBe(true);
    expect(active.state.board).toHaveLength(9);
    const first = active.state.currentPlayerId === userA.id ? a : b;
    await place(first, pages, matchId, 4, active.state.revision);
    await surrender(a);
    await expect(b.locator(".result-panel")).toBeVisible();
    for (const page of pages) {
      expect((await session(page)).cups).toBe(0);
      const done = await snapshot(page, matchId);
      expect(done.settlement.settled).toBe(true);
      expect(done.participants.every((p) => p.cupChange === 0)).toBe(true);
    }
    await a.screenshot({
      path: path.join(screenshots, "quick-match-result.png"),
      fullPage: true,
    });
  } finally {
    if (matchId)
      for (const page of pages)
        try {
          const state = await snapshot(page, matchId);
          if (state.state.status === "active")
            await page.evaluate(async (id) => {
              await fetch("/api/matches/" + id + "/surrender", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: crypto.randomUUID() }),
              });
            }, matchId);
        } catch {}
    await Promise.all(contexts.map((c) => c.close()));
  }
});
