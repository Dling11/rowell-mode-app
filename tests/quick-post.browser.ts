import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/owner-session";
const id = "4235d988-1517-4dcb-ac04-b61c68c3ba9c";
const now = "2026-10-30T00:00:00.000Z";
const image = {
  name: "quick-photo.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  ),
};
const provider = "https://api.cloudinary.com/v1_1/test-cloud/image/upload";
const media = {
  id,
  name: image.name,
  bytes: image.buffer.length,
  format: "png",
  createdAt: now,
  updatedAt: now,
  publishedAt: null,
};
async function mockPhoto(page: Page) {
  let transfers = 0,
    verifications = 0;
  await page.route("**/api/admin/uploads/signature", (route) =>
    route.fulfill({
      json: {
        id,
        url: provider,
        maxBytes: 5242880,
        fields: {
          public_id: `local-test/${id}`,
          type: "authenticated",
          signature: "mock-only",
          api_key: "test-only",
        },
      },
    }),
  );
  await page.route(provider, (route) => {
    transfers++;
    return route.fulfill({ json: { public_id: `local-test/${id}` } });
  });
  await page.route("**/api/admin/uploads/complete", (route) => {
    verifications++;
    return route.fulfill({ json: media });
  });
  await page.route(`**/api/admin/uploads/${id}/preview`, (route) =>
    route.fulfill({ status: 404 }),
  );
  return () => ({ transfers, verifications });
}

test("visitors cannot see quick actions or load the editor on public Gallery and Updates", async ({
  page,
  context,
}) => {
  const chunks: Promise<Buffer>[] = [];
  page.on("response", (response) => {
    if (/\/_next\/static\/.*\.js(?:\?|$)/.test(response.url()))
      chunks.push(response.body());
  });
  for (const route of ["/gallery", "/updates"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("region", { name: "Owner quick actions" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Add photo|Write a note/ }),
    ).toHaveCount(0);
  }
  const javascript = Buffer.concat(await Promise.all(chunks)).toString();
  expect(javascript).not.toContain("adminApi");
  expect(javascript).not.toContain("data-sonner-toaster");
  await signIn(context, "12345");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Owner quick actions" }),
  ).toHaveCount(0);
});

test("an existing owner session can save privately and publish a note directly on Updates", async ({
  page,
  context,
}) => {
  await signIn(context);
  let saves = 0,
    publishes = 0;
  await page.route("**/api/admin/notes", (route) => {
    saves++;
    const input = route.request().postDataJSON();
    return route.fulfill({
      json: { id, title: input.title, body: input.body, updatedAt: now },
    });
  });
  await page.route("**/api/admin/notes/publish", (route) => {
    publishes++;
    expect(route.request().postDataJSON()).toEqual({
      id,
      updatedAt: now,
      projectId: "personal",
      status: "In progress",
    });
    return route.fulfill({ json: { id, alreadyExists: false } });
  });
  await page.goto("/updates");
  const add = page.getByRole("button", { name: "Write a note" });
  await add.click();
  const dialog = page.getByRole("dialog", { name: "A new thought." });
  await dialog.getByLabel("Note title").fill("Private idea");
  await dialog.getByLabel("Note text").fill("Private draft text");
  await dialog
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Saved for your eyes." }),
  ).toBeVisible();
  expect(saves).toBe(1);
  expect(publishes).toBe(0);
  await expect(page).toHaveURL(/\/updates$/);
  await dialog.getByRole("button", { name: "Write another" }).click();
  await dialog.getByLabel("Note title").fill("A public note");
  await dialog.getByLabel("Note text").fill("Selected public text");
  await dialog
    .getByRole("button", { name: "Publish note", exact: true })
    .click();
  expect(publishes).toBe(0);
  expect(saves).toBe(1);
  await page
    .getByRole("dialog", { name: "Publish this note?" })
    .getByRole("button", { name: "Publish note", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Your note is published." }),
  ).toBeVisible();
  expect(saves).toBe(2);
  expect(publishes).toBe(1);
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
});

test("retrying failed quick-note publication reuses its saved private copy", async ({
  page,
  context,
}) => {
  await signIn(context);
  let saves = 0,
    publishes = 0;
  await page.route("**/api/admin/notes", (route) => {
    saves++;
    return route.fulfill({
      json: { id, title: "A thought", body: "Some text", updatedAt: now },
    });
  });
  await page.route("**/api/admin/notes/publish", (route) => {
    publishes++;
    return publishes === 1
      ? route.fulfill({
          status: 503,
          json: { error: "Publication unavailable" },
        })
      : route.fulfill({ json: { id, alreadyExists: false } });
  });
  await page.goto("/updates");
  await page.getByRole("button", { name: "Write a note" }).click();
  const dialog = page.getByRole("dialog", { name: "A new thought." });
  await dialog.getByLabel("Note title").fill("A thought");
  await dialog.getByLabel("Note text").fill("Some text");
  for (let attempt = 0; attempt < 2; attempt++) {
    await dialog
      .getByRole("button", { name: "Publish note", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Publish this note?" })
      .getByRole("button", { name: "Publish note", exact: true })
      .click();
    if (!attempt)
      await expect(dialog.getByRole("alert")).toContainText(
        "Publication unavailable",
      );
  }
  await expect(
    dialog.getByRole("heading", { name: "Your note is published." }),
  ).toBeVisible();
  expect(saves).toBe(1);
  expect(publishes).toBe(2);
});

test("quick gallery publication is explicit and can retry without another photo transfer", async ({
  page,
  context,
}) => {
  await signIn(context);
  const counts = await mockPhoto(page);
  let publishes = 0;
  await page.route("**/api/admin/uploads/publication", (route) => {
    publishes++;
    expect(route.request().postDataJSON()).toEqual({
      id,
      alt: "A tiny blue photo",
      caption: "A moment",
      publish: true,
      updatedAt: now,
    });
    return publishes === 1
      ? route.fulfill({
          status: 503,
          json: { error: "Publication unavailable" },
        })
      : route.fulfill({ json: { ok: true } });
  });
  await page.goto("/gallery");
  await page.getByRole("button", { name: "Add photo" }).click();
  const dialog = page.getByRole("dialog", { name: "A new moment." });
  await dialog.getByLabel("Photo file").setInputFiles(image);
  await dialog.getByLabel("Image description").fill("A tiny blue photo");
  await dialog.getByLabel("Caption", { exact: true }).fill("A moment");
  for (let attempt = 0; attempt < 2; attempt++) {
    await dialog
      .getByRole("button", { name: "Publish photo", exact: true })
      .click();
    if (!attempt) expect(counts()).toEqual({ transfers: 0, verifications: 0 });
    await page
      .getByRole("dialog", { name: "Publish this photo?" })
      .getByRole("button", { name: "Publish photo", exact: true })
      .click();
    if (!attempt)
      await expect(dialog.getByRole("alert")).toContainText(
        "Publication unavailable",
      );
  }
  await expect(
    dialog.getByRole("heading", { name: "A new moment in the gallery." }),
  ).toBeVisible();
  expect(counts()).toEqual({ transfers: 1, verifications: 1 });
  expect(publishes).toBe(2);
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page).toHaveURL(/\/gallery$/);
});

test("quick photos can stay private without a public description", async ({
  page,
  context,
}) => {
  await signIn(context);
  await mockPhoto(page);
  let input: Record<string, unknown> | undefined;
  await page.route("**/api/admin/uploads/publication", (route) => {
    input = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/gallery");
  await page.getByRole("button", { name: "Add photo" }).click();
  const dialog = page.getByRole("dialog", { name: "A new moment." });
  await dialog.getByLabel("Photo file").setInputFiles(image);
  await dialog
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Your photo is saved privately." }),
  ).toBeVisible();
  expect(input?.publish).toBe(false);
  expect(input?.alt).toBe("");
});

test("closing a quick-note editor confirms unsaved changes and restores focus", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/updates");
  const add = page.getByRole("button", { name: "Write a note" });
  await add.click();
  const editor = page.getByRole("dialog", { name: "A new thought." });
  await editor.getByLabel("Note title").fill("Keep this draft");
  await page.keyboard.press("Escape");
  const confirm = page.getByRole("dialog", { name: "Discard these edits?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor.getByLabel("Note title")).toHaveValue("Keep this draft");
  await editor.getByRole("button", { name: "Close editor" }).click();
  await page
    .getByRole("dialog", { name: "Discard these edits?" })
    .getByRole("button", { name: "Discard edits" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
});

test("quick editors fit mobile and remain accessible", async ({
  page,
  context,
}) => {
  await signIn(context);
  for (const [route, button, title] of [
    ["/gallery", "Add photo", "A new moment."],
    ["/updates", "Write a note", "A new thought."],
  ]) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(route);
    await page.getByRole("button", { name: button, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    if (process.env.HUB_CAPTURE_QUICK_PREVIEWS === "1") {
      const name = route === "/gallery" ? "quick-photo" : "quick-note";
      await page.screenshot({ path: `.private/previews/${name}-mobile.png`, animations: "disabled" });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: `.private/previews/${name}-desktop.png`, animations: "disabled" });
    }
    await dialog.getByRole("button", { name: "Close editor" }).click();
  }
});

test("ending the owner session hides quick actions and blocks further writes", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/gallery");
  await expect(page.getByRole("button", { name: "Add photo" })).toBeVisible();
  await context.clearCookies();
  const response = await context.request.post(
    "/api/admin/uploads/publication",
    {
      data: {
        id,
        alt: "Some image",
        caption: "",
        publish: true,
        updatedAt: now,
      },
      headers: { Origin: "http://127.0.0.1:3100" },
    },
  );
  expect(response.status()).toBe(401);
  await page.reload();
  await expect(page.getByRole("button", { name: "Add photo" })).toHaveCount(0);
});
