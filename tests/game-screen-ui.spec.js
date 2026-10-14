import { test, expect } from "@playwright/test";

test("core game stages and training boards remain fully within the viewport", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("ea:entered", "1"));
  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "/",
      "/powers",
      "/shop",
      "/leaderboard",
      "/local-play",
      "/daily-puzzle",
      "/tutorial",
    ]) {
      await page.goto(route);
      await expect(
        page.getByRole("main", { name: "Game screen" }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const stage = await page
          .getByRole("main", { name: "Game screen" })
          .boundingBox(),
        dock = await page
          .getByRole("navigation", { name: "Game destinations" })
          .boundingBox();
      expect(stage.x).toBeGreaterThanOrEqual(0);
      expect(stage.x + stage.width).toBeLessThanOrEqual(width + 0.5);
      expect(stage.y + stage.height).toBeLessThanOrEqual(dock.y + 0.5);
      if (["/local-play", "/daily-puzzle", "/tutorial"].includes(route)) {
        if (route === "/local-play") {
          await page
            .getByRole("button", { name: "Local options", exact: true })
            .click();
          const options = page.getByRole("dialog", {
            name: "Your local arena",
            exact: true,
          });
          await options
            .getByRole("button", { name: "6 by 6 board", exact: true })
            .click();
          await options
            .getByRole("button", { name: "PLAY", exact: true })
            .click();
          await expect(options).toBeHidden();
        }
        const board = page.locator(".game-board");
        await expect(board).toBeVisible();
        const b = await board.boundingBox();
        expect(b.x).toBeGreaterThanOrEqual(stage.x);
        expect(b.x + b.width).toBeLessThanOrEqual(stage.x + stage.width + 0.5);
        expect(b.y).toBeGreaterThanOrEqual(stage.y);
        expect(b.y + b.height).toBeLessThanOrEqual(dock.y + 0.5);
        const tiles = await board.locator(".game-cell").evaluateAll((cells) =>
          cells.map((el) => {
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height };
          }),
        );
        for (const tile of tiles) {
          expect(tile.width).toBeGreaterThanOrEqual(47.9);
          expect(tile.height).toBeGreaterThanOrEqual(48);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test("Escape closes only the top game modal and Settings retains the current screen", async ({
  page,
}) => {
  await page.goto("/powers");
  await page.getByRole("tab", { name: "Power Lab", exact: true }).click();
  await page
    .getByRole("button", { name: "Training power", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Training power", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Training power", exact: true }),
  ).toBeHidden();
  await expect(page).toHaveURL(/\/powers$/);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings).toBeVisible();
  await expect(page).toHaveURL(/\/powers$/);
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await expect(page).toHaveURL(/\/powers$/);
  await expect(
    page.getByRole("tab", { name: "Power Lab", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goto("/local-play");
  const local = page.getByRole("region", {
    name: "Local classic arena",
    exact: true,
  });
  await local.locator(".game-cell").first().click();
  await local
    .getByRole("button", { name: "Local options", exact: true })
    .click();
  const options = page.getByRole("dialog", {
    name: "Your local arena",
    exact: true,
  });
  await options
    .getByRole("button", { name: "4 by 4 board", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Start a new local game?",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();
  await expect(options).toBeVisible();
  await expect(page).toHaveURL(/\/local-play$/);
});
