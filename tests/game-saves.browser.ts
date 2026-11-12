import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/owner-session";
import type { SaveFolder } from "../src/features/game-saves/model/schema";
const id = "8a4e3b25-3236-4a91-9d5c-5b215e9b3d6c";
const backup = {
  id,
  game: "mh4u" as const,
  title: "Before urgent quest",
  name: "user1",
  bytes: 40,
  sha256: "a".repeat(64),
  createdAt: "2026-11-12T02:15:30Z",
};
const makeFolder = (): SaveFolder => ({
  id,
  name: "Rowell",
  files: [backup],
  bytes: 40,
  createdAt: "2026-11-12T00:00:00Z",
  inviteExpiresAt: null,
});
for (const width of [390, 1440])
  test(`owner save library uploads and keeps invitation controls scoped at ${width}px`, async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.setViewportSize({ width, height: 1000 });
    let folder = makeFolder();
    let deleted = false;
    await page.route("**/api/admin/game-saves**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "PATCH") {
        const action = request.postDataJSON().action;
        folder = {
          ...folder,
          inviteExpiresAt: action === "invite" ? "2026-11-19T00:00:00Z" : null,
        };
        return route.fulfill({
          json: { folder, token: action === "invite" ? "a".repeat(43) : null },
        });
      }
      if (request.method() === "DELETE") {
        deleted = true;
        folder = { ...folder, files: [] };
        return route.fulfill({ json: { ok: true } });
      }
      if (request.method() === "POST" && url.pathname.endsWith("/files")) {
        expect(request.headers()["content-type"]).toContain(
          "multipart/form-data",
        );
        expect(request.postDataBuffer()?.toString()).toContain(
          "synthetic save",
        );
        folder = {
          ...folder,
          files: [
            ...folder.files,
            {
              ...backup,
              id: "a6b32a47-eaa1-4c93-bde0-0422e26461df",
              title: "Test upload",
            },
          ],
        };
        return route.fulfill({ status: 201, json: folder });
      }
      return route.fulfill({ json: [folder] });
    });
    await page.goto("/admin/saves");
    await expect(
      page.getByRole("heading", { name: "Game saves", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Create link", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(page.getByLabel("New private link — copy it now")).toHaveCount(
      0,
    );
    await page
      .getByRole("button", { name: "Create link", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create private link", exact: true })
      .click();
    await expect(page.getByLabel("New private link — copy it now")).toHaveValue(
      new RegExp(`/saves/shared#${"a".repeat(43)}$`),
    );
    await page.getByLabel("Backup label").fill("Test upload");
    await page
      .getByLabel("Select exported save file")
      .setInputFiles({
        name: "user1",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("synthetic save"),
      });
    await page
      .getByRole("button", { name: "Upload backup", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Backup stored");
    await expect(page.getByText("Test upload", { exact: true })).toBeVisible();
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
    await page.screenshot({
      path: test.info().outputPath(`saves-${width}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Delete backup Before urgent quest" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    expect(deleted).toBe(false);
    await page
      .getByRole("button", { name: "Revoke link", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Revoke link", exact: true })
      .click();
    await expect(page.getByLabel("New private link — copy it now")).toHaveCount(
      0,
    );
  });
test("private invitation sends its token in Authorization, never the request URL", async ({
  page,
}) => {
  const token = "b".repeat(43);
  let requests = 0;
  await page.route("**/api/game-saves/shared", (route) => {
    requests++;
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    expect(route.request().url()).not.toContain(token);
    return route.fulfill({ json: makeFolder() });
  });
  await page.goto(`/saves/shared#${token}`);
  await expect(
    page.getByRole("heading", { name: "Rowell", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete backup/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Create link", exact: true }),
  ).toHaveCount(0);
  expect(requests).toBe(1);
  await page.goto("/saves/shared");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "complete private invitation",
  );
  expect(requests).toBe(1);
});
test("save routes require owner authentication and invitations fail closed", async ({
  request,
}) => {
  for (const route of [
    "/api/admin/game-saves",
    `/api/admin/game-saves/${id}/files/${id}`,
  ])
    expect((await request.get(route)).status()).toBe(401);
  const response = await request.get("/api/game-saves/shared");
  expect([401, 503]).toContain(response.status());
  const page = await request.get("/saves/shared");
  expect(page.headers()["x-robots-tag"]).toContain("noindex");
  expect(page.headers()["cache-control"]).toContain("no-store");
});
