import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/owner-session";
const login = "http://127.0.0.1:3105/admin/login";

test("a cold welcome bundle stays dark until the cinematic is ready", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let release!: () => void;
  let blocked = false;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes("OWNER VERIFIED") && body.includes("data-cinematic")) {
      blocked = true;
      await gate;
    }
    await route.fulfill({ response }).catch(() => {});
  });
  await page.route("**/api/auth/sign-in/owner-pin", (route) => route.fulfill({ json: { ok: true } }));
  try {
    await page.goto(login);
    await page.getByRole("button", { name: "PIN", exact: true }).click();
    await page.getByLabel("Owner PIN").fill("2468024680246802");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await expect.poll(() => blocked).toBe(true);
    expect(await page.locator("body").innerText()).not.toContain("WELCOME BOSS ROWELL");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: ".private/previews/welcome-dark-loading.png" });
    release();
    const scene = page.getByRole("dialog", { name: "WELCOME BOSS ROWELL" });
    await expect(scene).toHaveAttribute("data-ready", "true");
    expect(await scene.locator('[data-cinematic="name"] span').first().evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(0);
  } finally { release(); }
});

test("logging out immediately after the welcome clears its notice and cannot replay the entrance", async ({ page, context }) => {
  await signIn(context);
  await page.route("**/api/auth/passkey/list-user-passkeys", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/sign-out", async (route) => {
    await context.clearCookies();
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("rowell-mode:owner-notice", "signed-in"));
  await page.goto("/admin/account");
  await expect(page.getByText("Signed in. Welcome back, Rowell.", { exact: true })).toBeVisible();
  // Include an obsolete notice to verify that sign-out overwrites it.
  await page.evaluate(() => sessionStorage.setItem("rowell-mode:owner-notice", "signed-in"));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/admin/login");
  await expect(page.getByText("Signed out. Your workspace is locked.", { exact: true })).toBeVisible();
  expect(await page.getByText("Signed in. Welcome back, Rowell.", { exact: true }).count()).toBe(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-welcome-loading]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Back to the workbench." })).toBeVisible();
});
