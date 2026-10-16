import "dotenv/config";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SIZES = [
  [360, 640],
  [360, 740],
  [390, 844],
  [412, 915],
  [740, 360],
  [844, 390],
  [768, 1024],
  [1280, 720],
  [1440, 900],
];
const SCREENS = [
  "/",
  "/powers",
  "/shop",
  "/inventory",
  "/season-pass",
  "/missions",
  "/achievements",
  "/leaderboard",
  "/friends",
  "/profile",
  "/history",
  "/notifications",
  "/daily-puzzle",
  "/tutorial",
  "/local-play",
  "/tournaments",
];

async function read(page, route) {
  return page.evaluate(async (route) => {
    const response = await fetch(route, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error?.message || String(response.status));
    return body;
  }, route);
}
async function guest(page, label) {
  const origin = new URL(test.info().project.use.baseURL || "http://localhost:3000").origin;
  const response = await page.request.post("/api/auth/guest", {
    data: { name: `E2E ${label} ${Date.now().toString(36)}`.slice(0, 20) },
    headers: { origin },
  });
  expect(response.status()).toBe(201);
  const { user } = await response.json();
  const file = path.resolve(".runtime/e2e-test-users.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const ids = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : [];
  if (!ids.includes(user.id))
    fs.writeFileSync(file, JSON.stringify([...ids, user.id]));
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ea:entered", "1");
    } catch {}
  });
  return user;
}

// Collects layout problems visible in the current viewport.
function auditLayout() {
  const vw = innerWidth,
    vh = innerHeight,
    problems = [];
  const describe = (el) =>
    `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;
  const visible = (el) => {
    const s = getComputedStyle(el),
      r = el.getBoundingClientRect();
    return (
      s.visibility !== "hidden" &&
      s.display !== "none" &&
      Number(s.opacity) > 0.05 &&
      r.width > 0 &&
      r.height > 0
    );
  };
  const clipRect = (el) => {
    let rect = { left: 0, top: 0, right: vw, bottom: vh };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) {
        const r = p.getBoundingClientRect();
        rect = {
          left: Math.max(rect.left, r.left),
          top: Math.max(rect.top, r.top),
          right: Math.min(rect.right, r.right),
          bottom: Math.min(rect.bottom, r.bottom),
        };
      }
    }
    return rect;
  };
  if (document.documentElement.scrollWidth > vw + 1)
    problems.push(`page scrolls sideways by ${document.documentElement.scrollWidth - vw}px`);
  for (const el of document.querySelectorAll("main *, header *, nav *, [role=dialog] *")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const ownText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    const area = clipRect(el),
      r = el.getBoundingClientRect();
    const onScreen =
      r.bottom > area.top && r.top < area.bottom && r.right > area.left && r.left < area.right;
    if (!onScreen) continue;
    if (ownText) {
      if (parseFloat(s.fontSize) < 11)
        problems.push(`${describe(el)} uses ${s.fontSize} text`);
      const intentional =
        el.closest("[data-ellipsis], .clamp-2") ||
        s.textOverflow === "ellipsis" ||
        s.webkitLineClamp !== "none" ||
        s.clipPath.includes("inset(50%)");
      if (
        !intentional &&
        el.scrollWidth > el.clientWidth + 2 &&
        /(hidden|clip)/.test(s.overflowX)
      )
        problems.push(`${describe(el)} text is clipped`);
    }
    if (el.matches("button, a[href], [role=button], [role=tab], input")) {
      const fullyVisible =
        r.left >= area.left - 1 && r.right <= area.right + 1 && r.top >= area.top - 1 && r.bottom <= area.bottom + 1;
      if (fullyVisible && (r.width < 40 || r.height < 40))
        problems.push(`${describe(el)} is only ${Math.round(r.width)}×${Math.round(r.height)}`);
      const cx = r.left + r.width / 2,
        cy = r.top + r.height / 2;
      if (cx > area.left && cx < area.right && cy > area.top && cy < area.bottom) {
        const hit = document.elementFromPoint(cx, cy);
        if (
          hit &&
          !el.contains(hit) &&
          !hit.contains(el) &&
          !hit.closest("[role=dialog]") === !el.closest("[role=dialog]") &&
          !hit.closest("nextjs-portal") &&
          getComputedStyle(hit).pointerEvents !== "none"
        )
          problems.push(`${describe(el)} is covered by ${describe(hit)}`);
      }
    }
  }
  return [...new Set(problems)];
}

test.beforeEach(async ({}, info) => {
  info.setTimeout(900000);
  // Let requests from earlier specs age out of the per-minute API limit.
  await new Promise((resolve) => setTimeout(resolve, 30000));
});

test("every screen fits without overflow, clipping, tiny text or covered controls", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await guest(page, "Layout");
  await page.goto("/");
  const failures = [];
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    for (const route of SCREENS) {
      // Client-side navigation, paced well inside the per-player API budget.
      const started = Date.now();
      const pushed = await page.evaluate((route) => {
        if (!window.next?.router?.push) return false;
        window.next.router.push(route);
        return true;
      }, route);
      if (!pushed) await page.goto(route);
      await expect(page).toHaveURL(
        new RegExp(`${route === "/" ? "" : route}/?$`),
      );
      await expect(page.getByRole("main", { name: "Game screen" })).toBeVisible();
      await page.waitForTimeout(400);
      const problems = await page.evaluate(auditLayout);
      await page.waitForTimeout(Math.max(0, 1500 - (Date.now() - started)));
      for (const problem of problems)
        failures.push(`${width}×${height} ${route}: ${problem}`);
    }
  }
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

test("daily reward claim shows the right day, clears its dots and survives a reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page, "Daily");
  await page.goto("/");
  const tile = page.getByRole("button", { name: "Claim daily reward", exact: true });
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute("data-state", "ready");
  const journey = page
    .getByRole("navigation", { name: "Game destinations" })
    .getByRole("button", { name: "Journey", exact: true });
  await expect(journey.locator("[data-notification-dot]")).toBeVisible();
  const before = (await read(page, "/api/auth/session")).user.coins;
  await tile.click();
  const claimed = page.getByRole("button", { name: /^Daily reward claimed\. Next in / });
  await expect(claimed).toBeVisible();
  await expect(claimed).toHaveAttribute("data-state", "claimed");
  await expect(journey.locator("[data-notification-dot]")).toHaveCount(0);
  await expect
    .poll(async () => (await read(page, "/api/auth/session")).user.coins)
    .toBe(before + 40);
  await page.goto("/missions");
  const days = page.getByLabel("Seven day rewards", { exact: true });
  await expect(days.getByLabel("Day 1: 40 coins, claimed")).toBeVisible();
  await expect(days.getByLabel("Day 2: 50 coins, tomorrow")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Claimed today", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(days.getByLabel("Day 1: 40 coins, claimed")).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /^Daily reward claimed\. Next in / }),
  ).toBeVisible();
});

test("season, achievement and shop states are distinct", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await guest(page, "States");
  await page.goto("/season-pass");
  const free = page.getByRole("group", { name: "Free season rewards", exact: true });
  await expect(free.locator(".season-tier")).toHaveCount(5);
  await expect(free.locator(".season-tier").first()).toContainText("100 XP");
  await expect(free.locator("[data-next]")).toHaveCount(1);
  await expect(free.getByRole("button", { name: "Keep playing" })).toHaveCount(0);
  await page.goto("/achievements");
  const wall = page.getByLabel("Achievement badge wall", { exact: true });
  await expect(wall.locator("[data-state]").first()).toBeVisible();
  for (const card of await wall.locator("[data-state=locked]").all())
    await expect(card).not.toContainText("In progress");
  await page.goto("/shop");
  const cards = page.locator(".shop-card");
  await expect(cards.first()).toBeVisible();
  await expect(cards.filter({ hasText: "Need" }).first()).toBeVisible();
  await page.goto("/inventory");
  await expect(
    page.locator(".shop-card").getByRole("button", { name: "Equipped", exact: true }).first(),
  ).toBeDisabled();
});

test("an active match hides the dock and keeps every board cell uncovered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await guest(page, "Board");
  await page.goto("/");
  await page.getByRole("button", { name: "Select battle mode", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Choose your battle", exact: true })
    .getByRole("button", { name: "Practice Arena", exact: true })
    .click();
  const practice = page.getByRole("dialog", { name: "Sharpen your next move" });
  await practice.getByRole("button", { name: "Beginner", exact: true }).click();
  await practice.getByRole("button", { name: "Enter Practice Arena" }).click();
  await expect(page).toHaveURL(/\/battle$/);
  const board = page.getByRole("group", { name: "Three by three elemental game board" });
  await expect(board).toBeVisible();
  const intro = page.getByRole("button", { name: "Skip battle introduction" });
  if (await intro.isVisible().catch(() => false)) await intro.click();
  await expect(page.getByLabel("Battle introduction")).toHaveCount(0, {
    timeout: 15000,
  });
  for (const [width, height] of [[360, 640], [390, 844], [740, 360], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await expect(
      page.getByRole("navigation", { name: "Game destinations" }),
    ).toHaveCount(0);
    const covered = await board.getByRole("button").evaluateAll((cells) =>
      cells.filter((cell) => {
        const r = cell.getBoundingClientRect(),
          hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return (
          r.top < 0 || r.bottom > innerHeight || !hit || !(cell === hit || cell.contains(hit))
        );
      }).length,
    );
    expect(covered, `${width}×${height}`).toBe(0);
  }
  const match = (await read(page, "/api/matches/active")).match;
  if (match?.matchId)
    await page.evaluate(async (id) => {
      await fetch(`/api/matches/${id}/surrender`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID() }),
      });
    }, match.matchId);
});
