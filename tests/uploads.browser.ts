import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./helpers/owner-session";

const id = "4235d988-1517-4dcb-ac04-b61c68c3ba9c";
const image = {
  name: "private-test.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  ),
};
const provider = "https://api.cloudinary.com/v1_1/test-cloud/image/upload";

async function mockLibrary(page: Page) {
  await page.route("**/api/admin/uploads?*", (route) =>
    route.fulfill({ json: { items: [], nextPage: null } }),
  );
  await page.route("**/api/admin/uploads/signature", (route) =>
    route.fulfill({
      json: {
        id,
        url: provider,
        maxBytes: 5 * 1024 * 1024,
        fields: {
          public_id: `local-test/${id}`,
          type: "authenticated",
          signature: "mock-only",
          api_key: "test-only",
        },
      },
    }),
  );
}

test("private image verification can retry without uploading a second copy", async ({
  page,
  context,
}) => {
  await signIn(context);
  await mockLibrary(page);
  let transfers = 0;
  let verifications = 0;
  await page.route(provider, (route) => {
    transfers++;
    return route.fulfill({ json: { public_id: `local-test/${id}` } });
  });
  await page.route("**/api/admin/uploads/complete", (route) => {
    verifications++;
    return verifications === 1
      ? route.fulfill({
          status: 503,
          json: { error: "Temporary test failure" },
        })
      : route.fulfill({
          json: {
            id,
            name: image.name,
            format: "png",
            bytes: image.buffer.length,
            createdAt: "2026-10-30T00:00:00.000Z",
          },
        });
  });
  await page.goto("/admin/uploads");
  await expect(page.getByLabel("Image file")).toBeEnabled();
  await page.getByLabel("Image file").setInputFiles(image);
  await page.getByRole("button", { name: "Upload privately" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "verification didn’t finish",
  );
  await expect(
    page.getByText("Image uploaded and verified", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry verification" }).click();
  await expect(
    page.getByText("Image uploaded and verified", { exact: true }),
  ).toBeVisible();
  expect(transfers).toBe(1);
  expect(verifications).toBe(2);
  await expect(page.getByLabel("Image file")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Upload privately" }),
  ).toBeDisabled();
});

test("cancelling a transfer keeps the selected image retryable and does not verify it", async ({
  page,
  context,
}) => {
  await signIn(context);
  await mockLibrary(page);
  let releaseTransfer!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseTransfer = resolve;
  });
  let verifications = 0;
  await page.route(provider, async (route) => {
    await gate;
    await route.fulfill({ json: {} }).catch(() => {});
  });
  await page.route("**/api/admin/uploads/complete", (route) => {
    verifications++;
    return route.fulfill({ json: {} });
  });
  try {
    await page.goto("/admin/uploads");
    await expect(page.getByLabel("Image file")).toBeEnabled();
    await page.getByLabel("Image file").setInputFiles(image);
    await page.getByRole("button", { name: "Upload privately" }).click();
    await expect(
      page.getByRole("button", { name: "Transferring image…" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel transfer" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Transfer cancelled");
    await expect(
      page.getByRole("button", { name: "Upload privately" }),
    ).toBeEnabled();
    expect(verifications).toBe(0);
  } finally {
    releaseTransfer();
  }
});

test("transfer failure allows a normal retry and file validation blocks non-images", async ({
  page,
  context,
}) => {
  await signIn(context);
  await mockLibrary(page);
  let transfers = 0;
  await page.route(provider, (route) => {
    transfers++;
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/admin/uploads");
  await expect(page.getByLabel("Image file")).toBeEnabled();
  await page
    .getByLabel("Image file")
    .setInputFiles({
      name: "private.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test"),
    });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Choose a JPEG");
  await expect(
    page.getByRole("button", { name: "Upload privately" }),
  ).toBeDisabled();
  expect(transfers).toBe(0);
  await page.getByLabel("Image file").setInputFiles(image);
  await page.getByRole("button", { name: "Upload privately" }).click();
  await expect(
    page.getByRole("button", { name: "Upload privately" }),
  ).toBeEnabled();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Upload privately" }).click();
  await expect.poll(() => transfers).toBe(2);
});
