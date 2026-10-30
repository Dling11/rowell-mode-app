import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { signIn } from "./helpers/owner-session";

const id = "4235d988-1517-4dcb-ac04-b61c68c3ba9c";
const now = "2026-10-30T00:00:00.000Z";
const photo = { id, name: "isolated-photo.png", alt: "A blue test photo", caption: "Test moment", bytes: 1024, format: "png", createdAt: now, updatedAt: now, publishedAt: null };
async function sampleImage() { return sharp({ create: { width: 1200, height: 800, channels: 3, background: "#8fafd1" } }).png().toBuffer(); }

test("a selected upload previews locally and the saved private photo opens with zoom and focus restoration", async ({ page, context }) => {
  await signIn(context);
  const png = await sampleImage();
  let uploads = 0;
  await page.route("**/api/admin/uploads?*", (route) => route.fulfill({ json: { items: [photo], nextPage: null } }));
  await page.route(`**/api/admin/uploads/${id}/preview`, (route) => route.fulfill({ contentType: "image/png", body: png }));
  page.on("request", (request) => { if (request.url().includes("/uploads/signature")) uploads++; });
  await page.goto("/admin/uploads");
  await expect(page.getByLabel("Image file")).toBeEnabled();
  await page.getByLabel("Image file").setInputFiles({ name: "selected-photo.png", mimeType: "image/png", buffer: png });
  const localPreview = page.getByRole("img", { name: "Selected image preview" });
  await expect(localPreview).toBeVisible();
  await expect(localPreview).toHaveAttribute("src", /^blob:/);
  expect(uploads).toBe(0);
  const trigger = page.getByRole("button", { name: "Preview photo: Test moment" });
  await trigger.click();
  const viewer = page.locator(".yarl__root");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Zoom in" })).toBeEnabled();
  await viewer.getByRole("button", { name: "Zoom in" }).click();
  await expect(viewer.getByText("Test moment")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(uploads).toBe(0);
});

test("photo viewer fits a phone and exposes usable keyboard and close controls", async ({ page, context }) => {
  await signIn(context);
  await page.setViewportSize({ width: 320, height: 844 });
  const png = await sampleImage();
  await page.route("**/api/admin/uploads?*", (route) => route.fulfill({ json: { items: [photo], nextPage: null } }));
  await page.route(`**/api/admin/uploads/${id}/preview`, (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/admin/uploads");
  await page.getByRole("button", { name: "Preview photo: Test moment" }).click();
  await expect(page.locator(".yarl__root")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: ".private/previews/photo-viewer-mobile.png" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".yarl__root")).toHaveCount(0);
});

test("an explicit Motion On preference restores animation on a reduced-motion device", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play spotlight", exact: true })).toBeVisible();
  await page.getByLabel("Site animation").selectOption("full");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await expect(page.getByRole("button", { name: "Pause spotlight", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Site animation")).toHaveValue("full");
  await page.getByLabel("Site animation").selectOption("reduced");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByRole("button", { name: "Play spotlight", exact: true })).toBeVisible();
});

test("owner sign-in and sign-out notifications survive the transition between owner pages", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("rowell-mode:owner-notice", "signed-in"));
  await page.route("**/api/auth/passkey/list-user-passkeys", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/sign-out", async (route) => { await context.clearCookies(); await route.fulfill({ json: { success: true } }); });
  await page.goto("/admin/account");
  await expect(page.getByText("Signed in. Welcome back, Rowell.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByText("Signed out. Your workspace is locked.", { exact: true })).toBeVisible();
  expect(await page.getByText("Signed in. Welcome back, Rowell.", { exact: true }).count()).toBe(0);
  await expect(page.getByRole("dialog", { name: "WELCOME BOSS ROWELL" })).toHaveCount(0);
});

test("public pages advertise the approved logo and a real social preview image", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /\/icon\.png/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /^https:\/\/rowell-mode-app\.vercel\.app\/opengraph-image/);
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  const bytes = await image.body();
  const metadata = await sharp(bytes).metadata();
  expect([metadata.width, metadata.height]).toEqual([1200, 630]);
});
