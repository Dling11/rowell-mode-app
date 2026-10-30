import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/owner-session";
import { projects } from "../src/data/projects";

const pages = [
  "/",
  "/downloads",
  "/projects",
  "/projects/mh-tri",
  "/projects/share-mode",
  "/projects/mh4u",
  "/updates",
  "/gallery",
  "/about",
  "/admin/login",
  "/admin/setup",
];
for (const width of [320, 360, 390, 768, 1024, 1440])
  test(`public pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of pages) {
      await page.goto(route);
      await expect(page.locator('main[aria-busy="true"]')).toBeHidden();
      expect(
        await page
          .locator("body")
          .evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
      ).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
test("landscape, zoom, reduced motion, filters and keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rowell-mode:site-motion", "reduced"));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little curiosity/ }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByText("Skip to content")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeInViewport();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await page.goto("/projects?platform=source");
  await expect(
    page.getByRole("heading", { name: "Monster Hunter 4 — Rowell" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toHaveCount(0);
  await page.goto("/projects?q=no-matching-project");
  await expect(page.getByText("No projects found.")).toBeVisible();
  await page.goto("/");
  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
for (const route of pages)
  test(`accessibility scan: ${route}`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
test("source-only project has no download action and known releases remain labelled", async ({
  page,
}) => {
  await page.goto("/projects/mh4u");
  await expect(page.locator('a[href^="/download/"]')).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Explore source code/ }),
  ).toBeVisible();
  await page.goto("/projects/share-mode");
  await expect(
    page.getByText("Older public build · Share-Me-Rowell"),
  ).toBeVisible();
  await expect(page.getByText("Version 1.0.2", { exact: true })).toBeVisible();
});
test("public content and project navigation work before JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await expect(
    page.getByRole("heading", { name: /A little curiosity/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Projects & experiments." }),
  ).toBeVisible();
  await context.close();
});
test("private pages and every administrative endpoint require an owner", async ({
  request,
}) => {
  for (const route of [
    "/admin",
    "/admin/notes",
    "/admin/projects",
    "/admin/settings",
    "/admin/updates",
    "/admin/uploads",
    "/admin/account",
  ]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/admin/login");
  }
  for (const resource of [
    "notes",
    "updates",
    "settings",
    "projects",
    "releases",
    "overview",
    "uploads",
  ]) {
    const response = await request.get(`/api/admin/${resource}`);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  for (const resource of [
    "notes",
    "updates",
    "settings",
    "projects",
    "releases",
    "uploads/signature",
    "uploads/complete",
    "uploads/publication",
    "notes/publish",
  ]) {
    const response = await request.post(`/api/admin/${resource}`, {
      data: {},
      headers: { Origin: "http://127.0.0.1:3100" },
    });
    expect(response.status()).toBe(401);
  }
});
test("owner sessions require owner status, mutations reject cross-origin requests and outages are explicit", async ({
  context,
  page,
}) => {
  await signIn(context, "12345");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await signIn(context);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "A little room to build." }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "couldn’t load" }),
  ).toBeVisible();
  const response = await context.request.post("/api/admin/notes", {
    data: { title: "No write", body: "" },
    headers: { Origin: "https://untrusted.example" },
  });
  expect(response.status()).toBe(403);
  const malformed = await context.request.post("/api/admin/notes", {
    data: { title: "", body: "" },
    headers: { Origin: "http://127.0.0.1:3100" },
  });
  expect(malformed.status()).toBe(400);
  const unavailable = await context.request.get("/api/admin/notes");
  expect(unavailable.status()).toBe(503);
  const oversized = await context.request.post("/api/admin/notes", {
    data: { title: "Large", body: "a".repeat(70000) },
    headers: { Origin: "http://127.0.0.1:3100" },
  });
  expect(oversized.status()).toBe(413);
  const wrongType = await context.request.post("/api/admin/notes", {
    data: "plain text",
    headers: { Origin: "http://127.0.0.1:3100", "Content-Type": "text/plain" },
  });
  expect(wrongType.status()).toBe(415);
});
test("missing policy fails closed; no invented or visitor-controlled redirects", async ({
  request,
}) => {
  for (const route of [
    "/download/mh-tri/android",
    "/download/mh-tri/windows",
    "/download/share-mode/android",
    "/download/share-mode/windows",
  ]) {
    const response = await request.get(route + "?url=https://evil.example", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(503);
    expect(response.headers().location).toBeUndefined();
    expect(response.headers()["cache-control"]).toBe("no-store");
  }
  expect((await request.get("/download/mh4u/android")).status()).toBe(404);
  expect((await request.head("/download/mh-tri/android")).status()).toBe(503);
  const browserResponse = await request.get("/download/mh-tri/android", {
    headers: { Accept: "text/html" },
  });
  expect(browserResponse.status()).toBe(503);
  expect(browserResponse.headers()["content-type"]).toContain("text/html");
  expect(await browserResponse.text()).toContain("Explore projects");
});
test("maintenance protects direct public routes, leaves owner recovery and assets available", async ({
  request,
}) => {
  for (const route of [
    "/",
    "/downloads",
    "/projects",
    "/projects/mh-tri",
    "/updates",
    "/gallery",
    "/about",
  ]) {
    const response = await request.get("http://127.0.0.1:3101" + route);
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.text()).toContain("Updates in progress");
  }
  expect(
    (await request.get("http://127.0.0.1:3101/admin/login")).status(),
  ).toBe(200);
  expect((await request.get("http://127.0.0.1:3101/api/health")).status()).toBe(
    200,
  );
  expect(
    (
      await request.get("http://127.0.0.1:3101/images/mh-tri-icon.png")
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.get("http://127.0.0.1:3101/download/mh-tri/android")
    ).status(),
  ).toBe(503);
});
test("download pause keeps the portfolio readable", async ({ request }) => {
  expect(
    (await request.get("http://127.0.0.1:3102/projects/mh-tri")).status(),
  ).toBe(200);
  expect(
    (
      await request.get("http://127.0.0.1:3102/download/mh-tri/android")
    ).status(),
  ).toBe(503);
});
test("Vercel configuration without policy cannot accidentally open the public site", async ({
  request,
}) => {
  expect((await request.get("http://127.0.0.1:3103/")).status()).toBe(503);
  expect(
    (
      await request.get("http://127.0.0.1:3103/download/mh-tri/android")
    ).status(),
  ).toBe(503);
  expect(
    (await request.get("http://127.0.0.1:3103/admin/login")).status(),
  ).toBe(200);
  expect((await request.get("http://127.0.0.1:3103/api/health")).status()).toBe(
    200,
  );
});
test("owner note interactions restore focus and require deletion confirmation", async ({
  page,
  context,
}) => {
  await signIn(context);
  const note = {
    id: "4235d988-1517-4dcb-ac04-b61c68c3ba9c",
    title: "Test note",
    body: "PRIVATE_TEST_ONLY_SENTINEL",
    updatedAt: "2026-10-30T00:00:00.000Z",
  };
  let deleted = false;
  await page.route("**/api/admin/notes**", async (route) => {
    if (route.request().method() === "DELETE") {
      deleted = true;
      await route.fulfill({ json: { ok: true } });
    } else
      await route.fulfill({
        json: { items: deleted ? [] : [note], nextPage: null },
      });
  });
  await page.goto("/admin/notes");
  await page.getByRole("button", { name: /Test note/ }).click();
  await expect(page.getByLabel("Your note")).toHaveValue(note.body);
  const deleteButton = page.getByRole("button", {
    name: "Delete",
    exact: true,
  });
  await deleteButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(deleteButton).toBeFocused();
  expect(deleted).toBe(false);
  await deleteButton.click();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await expect(page.getByLabel("Your note")).toBeEmpty();
  expect(deleted).toBe(true);
  await page.goto("/");
  expect(await page.content()).not.toContain(note.body);
});

for (const width of [320, 390, 768, 1440])
  test(`owner forms fit at ${width}px with isolated records`, async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.setViewportSize({ width, height: 900 });
    const empty = { items: [], nextPage: null };
    await page.route("**/api/auth/passkey/list-user-passkeys", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/api/admin/**", async (route) => {
      const resource = new URL(route.request().url()).pathname
        .split("/")
        .at(-1)!;
      const data: Record<string, unknown> = {
        overview: {
          notes: 0,
          drafts: 0,
          published: 0,
          media: 0,
          clicks: [],
          policy: { mode: "normal", available: true },
        },
        notes: empty,
        updates: empty,
        uploads: empty,
        projects,
        releases: [],
        settings: {
          settings: {
            mode: "normal",
            pausedProjects: [],
            message: "Test pause message",
          },
          updatedAt: "2026-10-30T00:00:00.000Z",
          effectiveMode: "normal",
          emergencyMode: null,
        },
      };
      await route.fulfill({ json: data[resource] });
    });
    for (const route of [
      "/admin",
      "/admin/notes",
      "/admin/projects",
      "/admin/updates",
      "/admin/uploads",
      "/admin/settings",
      "/admin/account",
      "/install",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Loading your workspace…")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 390) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(result.violations).toEqual([]);
      }
    }
  });

test("public JavaScript excludes dashboard state and upload tooling", async ({
  page,
}, testInfo) => {
  const scripts: Promise<Buffer>[] = [];
  page.on("response", (response) => {
    if (/\/_next\/static\/.*\.js(?:\?|$)/.test(response.url()))
      scripts.push(response.body());
  });
  await page.goto("/");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  const bodies = await Promise.all(scripts);
  const content = Buffer.concat(bodies).toString("utf8");
  expect(content).not.toContain("adminApi");
  expect(content).not.toContain("data-sonner-toaster");
  expect(content).not.toContain("CLOUDINARY_API_SECRET");
  const size = bodies.reduce((sum, body) => sum + body.byteLength, 0);
  await testInfo.attach("public-client-size.json", {
    body: JSON.stringify({
      scriptRequests: bodies.length,
      uncompressedBytes: size,
    }),
    contentType: "application/json",
  });
  console.log(
    `Public page: ${bodies.length} JavaScript requests, ${size} uncompressed bytes; no dashboard/Redux/upload modules.`,
  );
});
