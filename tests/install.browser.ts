import { test, expect } from "@playwright/test";
import { site } from "../src/data/site";
import { signIn } from "./helpers/owner-session";

test("install manifest and correctly sized icons remain available during maintenance", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe(site.name);
  expect(manifest.id).toBe("/");
  expect(manifest.start_url).toBe("/admin");
  expect(manifest.scope).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.prefer_related_applications).toBe(false);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    const data = await response.body();
    const size = Number(icon.sizes.split("x")[0]);
    expect(data.readUInt32BE(16)).toBe(size);
    expect(data.readUInt32BE(20)).toBe(size);
  }
  for (const file of [
    "/manifest.webmanifest",
    "/sw.js",
    "/icons/app-192.png",
    "/offline.html",
  ])
    expect((await request.get(`http://127.0.0.1:3101${file}`)).status()).toBe(
      200,
    );
  expect(
    (
      await request.get("http://127.0.0.1:3101/install", { maxRedirects: 0 })
    ).status(),
  ).toBe(307);
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["content-type"]).toContain("javascript");
});

test("service worker stores only the public offline shell; private APIs and downloads stay network-only", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    )
      .flat()
      .sort();
  });
  expect(cached).toEqual(["/icons/app-192.png", "/offline.html"]);
  await context.setOffline(true);
  const response = await page.goto("/projects");
  expect(response?.status()).toBe(503);
  await expect(
    page.getByRole("heading", { name: "You’re offline." }),
  ).toBeVisible();
  expect(
    await page
      .locator("img")
      .evaluate(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0,
      ),
  ).toBe(true);
  for (const route of ["/api/admin/notes", "/download/mh-tri/android"]) {
    const result = await page.evaluate(async (route) => {
      try {
        await fetch(route);
        return "unexpected-response";
      } catch {
        return "network-error";
      }
    }, route);
    expect(result).toBe("network-error");
  }
  await page.goto("/admin/notes");
  await expect(
    page.getByRole("heading", { name: "You’re offline." }),
  ).toBeVisible();
  await expect(page.getByLabel("Your note")).toHaveCount(0);
  await context.setOffline(false);
});

test("a controlling worker preserves maintenance 503 rather than serving an old page", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3101/admin/login");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const response = await page.goto("http://127.0.0.1:3101/projects");
  expect(response?.status()).toBe(503);
  await expect(
    page.getByText("Updates in progress. Please check back soon.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You’re offline." }),
  ).toHaveCount(0);
});

test("install action waits for a browser event, handles dismissal and confirms actual installed events", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/install");
  await expect(
    page.getByRole("heading", { name: "Keep it a tap away." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Install app", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Install app", exact: true }).click();
  await expect(
    page.getByText("You can install later using Chrome’s menu."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Install app", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByText("App installed. Open it from your home screen."),
  ).toBeVisible();
});

test("installation requires an owner and preserves only approved return destinations", async ({
  context,
  request,
}) => {
  const visitor = await request.get("/install", { maxRedirects: 0 });
  expect(visitor.status()).toBe(307);
  expect(visitor.headers().location).toBe("/admin/login?returnTo=%2Finstall");
  await signIn(context);
  expect((await context.request.get("/install")).status()).toBe(200);
  const install = await context.request.get(
    "/admin/login?returnTo=%2Finstall",
    { maxRedirects: 0 },
  );
  expect(install.headers().location).toBe("/install");
  const untrusted = await context.request.get(
    "/admin/login?returnTo=https%3A%2F%2Funtrusted.example",
    { maxRedirects: 0 },
  );
  expect(untrusted.headers().location).toBe("/admin");
});
