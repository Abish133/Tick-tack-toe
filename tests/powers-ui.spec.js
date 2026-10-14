import { test, expect } from "@playwright/test";
import { POWER_CATALOG } from "../src/lib/game-engine/index.js";

test("all 22 powers activate through real Power Lab cell, line, direction and self controls", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/powers");
  await expect(
    page.getByRole("heading", { name: "The power collection", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".power-card")).toHaveCount(22);
  await page.getByRole("tab", { name: "Power Lab", exact: true }).click();
  const lab = page.locator(
    'section[aria-label="All power training laboratory"]',
  );
  const choice = lab.getByRole("button", {
    name: "Training power",
    exact: true,
  });
  await choice.click();
  await expect(
    page
      .getByRole("dialog", { name: "Training power", exact: true })
      .getByRole("button")
      .filter({ has: page.locator("svg") }),
  ).toHaveCount(23);
  await page.keyboard.press("Escape");
  const board = lab.getByRole("group", { name: "Power laboratory board" });
  for (const power of POWER_CATALOG) {
    await test.step(power.name, async () => {
      await choice.click();
      await page
        .getByRole("dialog", { name: "Training power", exact: true })
        .getByRole("button", { name: power.name, exact: true })
        .click();
      await expect(
        lab.getByRole("heading", { name: power.name, exact: true }),
      ).toBeVisible();
      if (["surge", "time", "echo"].includes(power.id))
        await lab
          .getByRole("button", { name: `Activate ${power.name}`, exact: true })
          .click();
      else if (["gravity", "dragon"].includes(power.id))
        await lab
          .locator(`[aria-label="${power.name} targets"] button:enabled`)
          .first()
          .click();
      else {
        await board.locator("button:enabled").first().click();
        if (["portal", "wind", "shadow", "tide"].includes(power.id))
          await board.locator("button:enabled").first().click();
      }
      await expect(lab).toContainText(
        power.id === "time"
          ? "The deadline extended. It is still your turn."
          : `${power.name} resolved. The opponent takes the next action.`,
      );
      await expect(
        board.locator(`[data-power-effect="${power.id}"]`),
      ).toHaveCount(1);
      await expect(lab.getByRole("alert")).toHaveCount(0);
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await choice.scrollIntoViewIfNeeded();
  await expect(lab).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("three equipped slots give clear replacement feedback and expose available power roles", async ({
  page,
}) => {
  await page.goto("/powers");
  const card = (name) =>
    page
      .locator(".power-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card("Fire Blast")).toBeEnabled();
  await expect(card("Fire Blast")).toHaveAttribute("aria-pressed", "true");
  await card("Meteor Crash").click();
  await expect(
    page.getByText(
      "Unequip one of your three powers before equipping Meteor Crash.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(card("Meteor Crash")).toHaveAttribute("aria-pressed", "false");
  await card("Fire Blast").click();
  await card("Meteor Crash").click();
  await expect(card("Meteor Crash")).toHaveAttribute("aria-pressed", "true");
  await expect(card("Fire Blast")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".loadout-summary")).toContainText(
    "3 / 3 equipped",
  );
  await page.getByRole("searchbox", { name: "Search powers" }).fill("reflect");
  await expect(card("Mirror Reflect")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search powers" }).fill("");
  await page.getByRole("button", { name: "Ultimate", exact: true }).click();
  await expect(page.locator(".power-card")).toHaveCount(1);
  await expect(card("Ultimate Eclipse")).toBeVisible();
});
