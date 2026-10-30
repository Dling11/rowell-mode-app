import { test, expect } from "@playwright/test";

test("the portfolio opens first and owner access lives in the footer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  const owner = page.locator('footer a[href="/admin"]');
  await expect(owner).toHaveText("Rowell-Mode");
  await owner.click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
});

test("spotlight rotates, pauses and supports manual project selection", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const spotlight = page.getByRole("region", { name: "Project spotlight" });
  await expect(
    spotlight.getByRole("heading", { name: "MH Tri — Rowell" }),
  ).toBeVisible();
  await page.clock.fastForward(6600);
  await expect(
    spotlight.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
  await spotlight
    .getByRole("button", { name: "Pause spotlight", exact: true })
    .click();
  await expect(
    spotlight.getByRole("button", { name: "Play spotlight", exact: true }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(15000);
  await expect(
    spotlight.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
  await spotlight
    .getByRole("button", { name: "Next spotlight project" })
    .click();
  await expect(
    spotlight.getByRole("heading", { name: "Monster Hunter 4 — Rowell" }),
  ).toBeVisible();
  await spotlight
    .getByRole("button", { name: "Previous spotlight project" })
    .click();
  await expect(
    spotlight.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
});

test("reduced motion starts paused while manual controls and Play remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const spotlight = page.getByRole("region", { name: "Project spotlight" });
  await expect(
    spotlight.getByRole("button", { name: "Play spotlight" }),
  ).toBeEnabled();
  await page.clock.fastForward(20000);
  await expect(
    spotlight.getByRole("heading", { name: "MH Tri — Rowell" }),
  ).toBeVisible();
  await spotlight
    .getByRole("button", { name: "Next spotlight project" })
    .click();
  await expect(
    spotlight.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
});

test("download list filters public packages and keeps source-only builds unavailable", async ({
  page,
}) => {
  await page.goto("/downloads");
  const list = page.getByRole("list", { name: "Project packages" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await expect(
    list.getByRole("button", { name: /download is unavailable/ }),
  ).toHaveCount(4);
  await expect(
    page.getByText("In testing · Source only", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/download/mh4u/"]')).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Download platforms" })
    .getByRole("link", { name: "PC", exact: true })
    .click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Search downloads", exact: true })
    .fill("Share");
  await page
    .getByRole("button", { name: "Search downloads", exact: true })
    .click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(
    list.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
});
