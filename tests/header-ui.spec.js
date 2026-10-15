import { test, expect } from "@playwright/test";

test("HUD stays on one row with 48px controls and real balances at phone and desktop sizes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "header-layout-preview",
          name: "Header Preview",
          guest: true,
          role: "PLAYER",
          cups: 1900,
          coins: 2147483647,
          level: 12345,
          loadout: ["fire", "shield", "portal"],
          profile: { avatar: "avatar-void" },
          settings: { sound: true, reducedMotion: true },
        },
        features: {},
      },
    }),
  );
  await page.goto("/local-play");
  const hud = page.getByRole("banner", { name: "Player HUD", exact: true });
  for (const width of [320, 360, 390, 412, 600, 760, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const boxes = await hud.getByRole("button").evaluateAll((elements) =>
      elements
        .filter((el) => el.getClientRects().length)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            name: el.getAttribute("aria-label"),
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        }),
    );
    for (const box of boxes) {
      expect(box.x, `${width}px ${box.name} left`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${width}px ${box.name} right`).toBeLessThanOrEqual(
        width + 0.5,
      );
      expect(
        box.height,
        `${width}px ${box.name} touch height`,
      ).toBeGreaterThanOrEqual(48);
    }
    const settings = boxes.find((b) => b.name === "Settings"),
      account = boxes.find((b) => b.name === "Player account"),
      cups = boxes.find((b) => b.name?.startsWith("Trophies:")),
      coins = boxes.find((b) => b.name?.startsWith("Cosmetic coins:"));
    expect(Math.abs(settings.y - cups.y)).toBeLessThanOrEqual(3);
    expect(Math.abs(cups.y - coins.y)).toBeLessThanOrEqual(1);
    expect(account.right).toBeLessThanOrEqual(cups.x);
    expect(cups.right).toBeLessThanOrEqual(coins.x);
    for (const resource of [
      hud.getByRole("button", { name: /Trophies:/ }),
      hud.getByRole("button", { name: /Cosmetic coins:/ }),
    ]) {
      const layout = await resource.evaluate((button) => {
        const pill = button.getBoundingClientRect();
        const icon = button.querySelector("svg").getBoundingClientRect();
        const value = button.querySelector("strong");
        const number = value.getBoundingClientRect();
        return {
          iconInside: icon.left >= pill.left && icon.right <= pill.right,
          numberInside: number.left >= icon.right && number.right <= pill.right,
          valueFits: value.scrollWidth <= value.clientWidth + 1,
        };
      });
      expect(layout, `${width}px resource contents fit inside their counter`).toEqual({
        iconInside: true, numberInside: true, valueFits: true,
      });
    }
    if (width <= 600) expect((await hud.boundingBox()).height).toBeLessThanOrEqual(52.5);
    expect(
      boxes.filter((b) =>
        ["Notifications", "Settings", "Mute sound"].includes(b.name),
      ),
    ).toHaveLength(3);
  }
  await expect(
    hud.getByRole("button", { name: /Cosmetic coins:/ }),
  ).toHaveAttribute("title", /2,147,483,647/);
  await expect(hud.locator('i[aria-hidden="true"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await hud.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Journey", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Your arena journey" })
      .getByRole("button", { name: "Notifications", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("phone Armory leaves room for the power catalog and counters fit ordinary balances", async ({page}) => {
  await page.route("**/api/auth/session", route => route.fulfill({json:{user:{
    id:"compact-armory-preview",name:"Compact Preview",guest:true,role:"PLAYER",
    cups:0,coins:195,level:1,loadout:["crystal","shadow","poison"],
    profile:{avatar:"avatar-void"},settings:{sound:true,reducedMotion:true},
  },features:{}}}));
  await page.addInitScript(()=>sessionStorage.setItem("ea:entered","1"));
  await page.setViewportSize({width:360,height:740});
  await page.goto("/powers");
  const hud=page.getByRole("banner",{name:"Player HUD",exact:true});
  await expect(hud.getByRole("button",{name:"Trophies: 0",exact:true}).locator("strong")).toHaveText("0");
  await expect(hud.getByRole("button",{name:"Cosmetic coins: 195",exact:true}).locator("strong")).toHaveText("195");
  const deck=page.getByRole("region",{name:"Power deck builder",exact:true});
  const summary=deck.locator(".loadout-summary");
  expect((await summary.boundingBox()).height).toBeLessThanOrEqual(120);
  const grid=deck.locator(".power-grid");
  expect((await grid.boundingBox()).height).toBeGreaterThanOrEqual(230);
  const connection=page.locator('[data-arena-connection]');
  if(await connection.isVisible()) {
    const notice=await connection.boundingBox();
    const back=await page.getByRole("button",{name:"Back to arena",exact:true}).boundingBox();
    expect(back.y).toBeGreaterThanOrEqual(notice.y+notice.height);
  }
  await deck.getByRole("searchbox",{name:"Search powers",exact:true}).fill("fire");
  await expect(deck.locator(".power-card")).not.toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
