import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("MDM appears only in the Windows directory and credits its original authors", async ({ page }) => {
  await page.goto("/downloads?platform=windows&q=Mister");
  const packages = page.getByRole("list", { name: "Project packages" });
  await expect(packages.getByRole("link", { name: /Mister Download Manager/ })).toBeVisible();
  await expect(packages.locator('a[href="/projects/mdm"]')).not.toHaveCount(0);
  await expect(packages.locator('a[href="/download/mdm/android"]')).toHaveCount(0);
  await page.goto("/downloads?platform=android&q=Mister");
  await expect(page.getByText("No projects match this search.")).toBeVisible();
  await page.goto("/projects/mdm");
  await expect(page.getByRole("heading", { level: 1, name: "Mister Download Manager" })).toBeVisible();
  await expect(page.getByText(/Ahmed Nefzaoui/, { exact: false }).first()).toBeVisible();
  await expect(page.locator('a[href="https://github.com/anefzaoui/misterdownloadmanager"]').first()).toBeVisible();
  await expect(page.getByText(/Under review/).first()).toBeVisible();
  await expect(page.locator('a[href*="IDM_SOURCE_MODDED"]')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.private/previews/mdm-public-${width}.png`, fullPage: true });
  }
});

test("MDM Android requests are rejected even when the database is unavailable", async ({ request }) => {
  const response = await request.head("/download/mdm/android");
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await request.head("/download/mdm/windows")).status()).toBe(503);
});
