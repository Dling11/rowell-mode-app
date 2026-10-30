import { test, expect } from "@playwright/test";

const key = "rowell-mode:site-motion";
const label = "Animations on this device";
const login = "http://127.0.0.1:3105/admin/login";

test("the desktop and phone keep independent choices after reload and reopening a page", async ({ browser }) => {
  const desktop = await browser.newContext();
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const pc = await desktop.newPage();
    const mobile = await phone.newPage();
    await pc.goto("http://127.0.0.1:3100/");
    await mobile.goto("http://127.0.0.1:3100/");
    await expect(mobile.getByLabel(label)).toHaveValue("full");
    await pc.getByLabel(label).selectOption("reduced");
    await mobile.reload();
    await expect(mobile.getByLabel(label)).toHaveValue("full");
    await pc.close();
    const reopened = await desktop.newPage();
    await reopened.goto("http://127.0.0.1:3100/downloads");
    await expect(reopened.getByLabel(label)).toHaveValue("reduced");
    await expect(reopened.locator("html")).toHaveAttribute("data-motion", "reduced");
    await mobile.screenshot({ path: ".private/previews/animations-on-phone.png", fullPage: true });
  } finally { await desktop.close(); await phone.close(); }
});

test("tabs in the same browser update together and the entrance uses the same choice", async ({ page, context }) => {
  await page.goto(login);
  await page.locator("summary").filter({ hasText: "Choose your entrance" }).click();
  await page.getByLabel(label).selectOption("reduced");
  const other = await context.newPage();
  await other.goto(login);
  await other.locator("summary").filter({ hasText: "Choose your entrance" }).click();
  await expect(other.getByLabel(label)).toHaveValue("reduced");
  await other.getByRole("button", { name: "Preview entrance" }).click();
  const scene = other.getByRole("dialog");
  await expect(scene).toHaveAttribute("data-motion", "still");
  await scene.getByRole("button", { name: "Play full animation" }).click();
  await expect(page.getByLabel(label)).toHaveValue("full");
  await page.getByLabel(label).selectOption("reduced");
  await expect(scene).toHaveAttribute("data-motion", "still");
  await scene.getByRole("button", { name: "Close preview" }).click();
  await expect(other.getByLabel(label)).toHaveValue("reduced");
});

test("saved Off applies before the app JavaScript loads", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rowell-mode:site-motion", "reduced"));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async (route) => { await gate; await route.continue().catch(() => {}); });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.getByRole("heading", { name: /A little curiosity/ })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    release();
    await expect(page.getByLabel(label)).toHaveValue("reduced");
  } finally { release(); }
});

test("Off still works for the current tab when storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) {
      if (name === "rowell-mode:site-motion" || name === "rowell-mode:welcome-motion") throw new DOMException("Storage blocked", "SecurityError");
      return get.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === "rowell-mode:site-motion") throw new DOMException("Storage blocked", "SecurityError");
      return set.call(this, name, value);
    };
  });
  await page.goto("/");
  await expect(page.getByLabel(label)).toHaveValue("full");
  await page.getByLabel(label).selectOption("reduced");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("link", { name: "Downloads", exact: true }).click();
  await expect(page.getByLabel(label)).toHaveValue("reduced");
});

test("an earlier explicit still view stays Off until the owner changes it", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rowell-mode:welcome-motion", "still"));
  await page.goto("/");
  await expect(page.getByLabel(label)).toHaveValue("reduced");
  await page.getByLabel(label).selectOption("full");
  await page.reload();
  await expect(page.getByLabel(label)).toHaveValue("full");
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe("full");
});
