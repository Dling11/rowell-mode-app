import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/owner-session";

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

for (const width of [1440, 320]) {
  test(`navigation shows feedback while a platform response waits and clears on completion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    if (width === 320) await page.emulateMedia({ reducedMotion: "reduce" });
    const gate = deferred();
    await page.route("**/downloads?**", async (route) => {
      if (new URL(route.request().url()).searchParams.get("platform") === "windows") await gate.promise;
      await route.continue();
    });
    await page.goto("/downloads");
    await page.getByRole("navigation", { name: "Download platforms" }).getByRole("link", { name: "PC", exact: true }).click();
    await expect(page.locator("[data-navigation-pending]").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) {
      const spinner = page.locator('[data-navigation-pending] [aria-hidden="true"]').last();
      expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    }
    await page.screenshot({ path: `.private/previews/loading-navigation-${width}.png`, fullPage: true });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    gate.release();
    await expect(page.getByRole("list", { name: "Project packages" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.locator("[data-navigation-pending]")).toHaveCount(0);
    await page.goBack();
    await expect(page.getByRole("list", { name: "Project packages" }).getByRole("listitem")).toHaveCount(5);
    await expect(page.locator("[data-navigation-pending]")).toHaveCount(0);
  });
}

test("search stays responsive with visible feedback until matching results arrive", async ({ page }) => {
  const gate = deferred();
  await page.route("**/downloads?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === "Share") await gate.promise;
    await route.continue();
  });
  await page.goto("/downloads");
  await page.getByRole("searchbox", { name: "Search downloads" }).fill("Share");
  await page.getByRole("button", { name: "Search downloads" }).click();
  await expect(page.locator("[data-navigation-pending]").first()).toBeVisible();
  gate.release();
  await expect(page.getByRole("list", { name: "Project packages" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.locator("[data-navigation-pending]")).toHaveCount(0);
});

test("sign-in shows a real pending state and recovers after a failed request", async ({ page }) => {
  const gate = deferred();
  await page.route("**/api/auth/sign-in/username", async (route) => {
    await gate.promise;
    await route.fulfill({ status: 401, json: { message: "Invalid test credentials" } });
  });
  await page.goto("http://127.0.0.1:3105/admin/login");
  await page.getByLabel("Username", { exact: true }).fill("testowner");
  await page.getByLabel("Password", { exact: true }).fill("isolated-wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const button = page.getByRole("button", { name: "Signing in…", exact: true });
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toBeDisabled();
  await expect(button.locator('span[aria-hidden="true"]')).toBeVisible();
  gate.release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Sign-in failed");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("saving a note prevents repeat submission and restores the draft after a server error", async ({ page, context }) => {
  await signIn(context);
  const gate = deferred();
  let requests = 0;
  await page.route("**/api/admin/notes", async (route) => {
    requests++;
    await gate.promise;
    await route.fulfill({ status: 503, json: { error: "Save unavailable" } });
  });
  await page.goto("/updates");
  await page.getByRole("button", { name: "Write a note" }).click();
  const dialog = page.getByRole("dialog", { name: "A new thought." });
  await dialog.getByLabel("Note title").fill("An isolated draft");
  await dialog.getByLabel("Note text").fill("Keep this draft after the mocked failure.");
  await dialog.getByRole("button", { name: "Save privately", exact: true }).click();
  const button = dialog.getByRole("button", { name: "Saving…", exact: true });
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toBeDisabled();
  await button.evaluate((element) => (element as HTMLButtonElement).click());
  expect(requests).toBe(1);
  gate.release();
  await expect(dialog.getByRole("alert")).toContainText("Save unavailable");
  await expect(dialog.getByRole("button", { name: "Save privately", exact: true })).toBeEnabled();
  await expect(dialog.getByLabel("Note title")).toHaveValue("An isolated draft");
  await expect(dialog.getByLabel("Note text")).toHaveValue("Keep this draft after the mocked failure.");
});
