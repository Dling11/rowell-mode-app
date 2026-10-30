import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/owner-session";
import { projects } from "../src/data/projects";
const id = "4235d988-1517-4dcb-ac04-b61c68c3ba9c";
const now = "2026-10-30T00:00:00.000Z";
const photo = {
  id,
  name: "private-filename.png",
  alt: "A blue landscape",
  caption: "A good day",
  bytes: 1024,
  format: "png",
  createdAt: now,
  updatedAt: now,
  publishedAt: null as string | null,
};

test("spotlight continues after manual selection and loops back to the first project", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const spotlight = page.getByRole("region", { name: "Project spotlight" });
  await spotlight
    .getByRole("button", { name: "Next spotlight project" })
    .click();
  await expect(
    spotlight.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(4900);
  await expect(
    spotlight.getByRole("heading", { name: "Monster Hunter 4 — Rowell" }),
  ).toBeVisible();
  await page.clock.fastForward(4900);
  await expect(
    spotlight.getByRole("heading", { name: "MH Tri — Rowell" }),
  ).toBeVisible();
});
test("Tri resources are external references and Android includes MH4U without an installer", async ({
  page,
}) => {
  await page.goto("/projects/mh-tri");
  await expect(
    page.getByRole("heading", { name: "Resources & history." }),
  ).toBeVisible();
  await expect(
    page.locator(
      'a[href="https://monster-hunter-tri-android-apk.vercel.app/"]',
    ),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.locator(
      'a[href="https://romsfun.com/download/monster-hunter-3-tri-id1-13483/2"]',
    ),
  ).toBeVisible();
  await page.goto("/downloads?platform=android");
  await expect(
    page.getByRole("list", { name: "Project packages" }).getByRole("listitem"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Monster Hunter 4 — Rowell" }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/download/mh4u"]')).toHaveCount(0);
});
test("public gallery is empty until publication and media endpoints enforce authorization and maintenance", async ({
  page,
  request,
}) => {
  await page.goto("/gallery");
  await expect(
    page.getByRole("heading", { name: "The first frame is still to come." }),
  ).toBeVisible();
  expect(await page.content()).not.toContain(photo.name);
  expect((await request.get(`/api/admin/uploads/${id}/preview`)).status()).toBe(
    401,
  );
  expect(
    (await request.get("/api/admin/projects/mh-tri/history")).status(),
  ).toBe(401);
  expect((await request.get(`/media/${id}`)).status()).toBe(503);
  expect(
    (await request.get(`http://127.0.0.1:3101/media/${id}`)).status(),
  ).toBe(503);
  await expect(page.locator('img[src^="/api/admin/"]')).toHaveCount(0);
});
test("owner explicitly publishes a photo and can make it private again", async ({
  page,
  context,
}) => {
  await signIn(context);
  let record = { ...photo };
  const writes: unknown[] = [];
  await page.route("**/api/admin/uploads?*", (route) =>
    route.fulfill({ json: { items: [record], nextPage: null } }),
  );
  await page.route(`**/api/admin/uploads/${id}/preview`, (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route("**/api/admin/uploads/publication", async (route) => {
    const input = route.request().postDataJSON();
    writes.push(input);
    record = {
      ...record,
      alt: input.alt,
      caption: input.caption,
      publishedAt: input.publish ? now : null,
      updatedAt: new Date(Date.parse(record.updatedAt) + 1000).toISOString(),
    };
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/admin/uploads");
  await page
    .getByRole("button", { name: "Publish photo", exact: true })
    .click();
  expect(writes).toHaveLength(0);
  await expect(page.getByRole("dialog")).toContainText("public gallery");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Publish photo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Make private", exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Make private", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Make private", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish photo", exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
});
test("saved notes need explicit copy publication and unsaved changes block sharing", async ({
  page,
  context,
}) => {
  await signIn(context);
  const note = {
    id,
    title: "Selected test note",
    body: "OWNER_ONLY_TEST_TEXT",
    updatedAt: now,
  };
  let copies = 0;
  await page.route("**/api/admin/notes?*", (route) =>
    route.fulfill({ json: { items: [note], nextPage: null } }),
  );
  await page.route("**/api/admin/notes/publish", (route) => {
    copies++;
    expect(route.request().postDataJSON()).not.toHaveProperty("body");
    return route.fulfill({ json: { id, alreadyExists: false } });
  });
  await page.goto("/admin/notes");
  await page.getByRole("button", { name: /Selected test note/ }).click();
  await page.getByLabel("Your note").fill("Unsaved private text");
  await expect(
    page.getByRole("button", { name: "Publish a copy" }),
  ).toBeDisabled();
  await page.getByLabel("Your note").fill(note.body);
  await page.getByRole("button", { name: "Publish a copy" }).click();
  expect(copies).toBe(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Publish note copy" })
    .click();
  await expect(
    page.getByRole("link", { name: "View published copy" }),
  ).toBeVisible();
  expect(copies).toBe(1);
  await expect(page.getByLabel("Your note")).toHaveValue(note.body);
});
test("owner can select a published cover and save resource links with history", async ({
  page,
  context,
}) => {
  await signIn(context);
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/admin/projects", (route) => {
    if (route.request().method() === "POST") {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: projects });
  });
  await page.route("**/api/admin/projects/*/history", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/admin/releases**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/admin/uploads?*", (route) =>
    route.fulfill({
      json: { items: [{ ...photo, publishedAt: now }], nextPage: null },
    }),
  );
  await page.route(`**/media/${id}`, (route) => route.fulfill({ status: 404 }));
  await page.goto("/admin/projects");
  await page.getByRole("button", { name: "Use A blue landscape" }).click();
  await page.getByLabel("Link 1 title").fill("Tri archive");
  await page
    .getByRole("button", { name: "Save public changes", exact: true })
    .click();
  expect(saved).toBeUndefined();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save public changes" })
    .click();
  await expect.poll(() => saved?.coverMediaId).toBe(id);
  expect((saved?.resources as { title: string }[])[0].title).toBe(
    "Tri archive",
  );
});
test("populated owner media and note publishing controls fit on a small phone", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/api/admin/uploads?*", (route) =>
    route.fulfill({ json: { items: [photo], nextPage: null } }),
  );
  await page.route(`**/api/admin/uploads/${id}/preview`, (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/admin/uploads");
  await expect(page.getByLabel("Image description")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
