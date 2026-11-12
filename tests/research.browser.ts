import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/owner-session";
import { emptyResearch, type ResearchItem } from "../src/features/research/model/schema";
const id = "4235d988-1517-4dcb-ac04-b61c68c3ba9c";
const now = "2026-11-12T00:00:00Z";
function sample(): ResearchItem { return { ...emptyResearch, id, title: "Example utility", repositoryUrl: "https://github.com/example/utility", summary: "A project to revisit later.", notes: "PRIVATE_RESEARCH_NOTE", status: "Evaluating", tags: ["Rust", "Desktop"], snapshotCommit: "a".repeat(40), snapshotVersion: "1.0", createdAt: now, updatedAt: now, upstream: null }; }

for (const width of [320, 1440]) test(`private research saves notes, keeps failed drafts and checks updates at ${width}px`, async ({ page, context }) => {
  await signIn(context);
  await page.setViewportSize({ width, height: 1000 });
  let item = sample(); let failSave = true; let removed = false;
  await page.route("**/api/admin/research**", async (route) => {
    const request = route.request();
    if (request.url().includes("/check")) { item = { ...item, upstream: { checkedAt: now, defaultBranch: "main", latestCommit: "b".repeat(40), pushedAt: now, archived: false, release: { tag: "v2.0", publishedAt: now, prerelease: false } }, updatedAt: "2026-11-12T00:00:02Z" }; return route.fulfill({ json: item }); }
    if (request.method() === "POST") {
      if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { error: "Save temporarily unavailable" } }); }
      item = { ...item, ...request.postDataJSON(), updatedAt: "2026-11-12T00:00:01Z" }; return route.fulfill({ json: item });
    }
    if (request.method() === "DELETE") { removed = true; return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ json: { items: removed ? [] : [item], nextPage: null } });
  });
  await page.goto("/admin/research");
  await expect(page.getByRole("heading", { name: "Research & plans." })).toBeVisible();
  await expect(page.getByText("PRIVATE_RESEARCH_NOTE", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Edit entry", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit research entry" });
  await editor.getByLabel("Why I saved this & next steps").fill("Keep my private draft after a failed save.");
  await editor.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(editor.getByRole("alert")).toHaveText("Save temporarily unavailable");
  await expect(editor.getByLabel("Why I saved this & next steps")).toHaveValue("Keep my private draft after a failed save.");
  await editor.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText("Research entry saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Check GitHub", exact: true }).click();
  await expect(page.getByRole("link", { name: /Upstream has new source changes/ })).toHaveAttribute("href", /\/compare\/a{40}\.\.\.b{40}$/);
  await expect(page.getByText("Keep my private draft after a failed save.", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `.private/previews/research-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Remove research entry" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect(removed).toBe(false);
  await page.getByRole("button", { name: "Remove research entry" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove entry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keep your next idea here." })).toBeVisible();
});

test("new research entries support screenshots and keep unsaved changes until explicitly discarded", async ({ page, context }) => {
  await signIn(context);
  await page.route("**/api/admin/research**", (route) => route.fulfill({ json: { items: [], nextPage: null } }));
  await page.route("**/api/admin/uploads?*", (route) => route.fulfill({ json: { items: [], nextPage: null } }));
  await page.goto("/admin/research");
  await page.getByRole("button", { name: "Save a project", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Save something for later" });
  await editor.getByLabel("Title", { exact: true }).fill("A future project");
  await editor.locator("summary").filter({ hasText: "Source snapshot & screenshot" }).click();
  await expect(editor.getByLabel("Upstream screenshot URL")).toBeVisible();
  await expect(editor.getByRole("link", { name: "Upload a screenshot" })).toHaveAttribute("href", "/admin/uploads");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Discard these edits?" })).toBeVisible();
  await page.getByRole("dialog", { name: "Discard these edits?" }).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor.getByLabel("Title", { exact: true })).toHaveValue("A future project");
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard these edits?" }).getByRole("button", { name: "Discard edits", exact: true }).click();
  await expect(editor).toHaveCount(0);
});

test("research errors can retry and private APIs enforce owner authentication, origin and strict inputs", async ({ page, context, request }) => {
  const denied = await request.get("/api/admin/research");
  expect(denied.status()).toBe(401);
  expect(denied.headers()["cache-control"]).toContain("no-store");
  expect((await request.post(`/api/admin/research/${id}/check`, { data: { updatedAt: now } })).status()).toBe(401);
  expect((await request.get("/admin/research", { maxRedirects: 0 })).status()).toBe(307);
  await signIn(context);
  expect((await context.request.post("/api/admin/research", { headers: { origin: "https://wrong.invalid" }, data: {} })).status()).toBe(403);
  expect((await context.request.post("/api/admin/research", { headers: { origin: "http://127.0.0.1:3100" }, data: { ...sample(), ownerId: "another-owner" } })).status()).toBe(400);
  let failed = true;
  await page.route("**/api/admin/research?*", (route) => route.fulfill(failed ? { status: 503, json: { error: "Unavailable" } } : { json: { items: [sample()], nextPage: null } }));
  await page.goto("/admin/research");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("couldn’t load");
  failed = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("PRIVATE_RESEARCH_NOTE", { exact: true })).toBeVisible();
  const publicPage = await request.get("/");
  expect(await publicPage.text()).not.toContain("PRIVATE_RESEARCH_NOTE");
});
