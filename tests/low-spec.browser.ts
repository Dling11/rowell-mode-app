import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1440]) {
  test(`Low Spec is distinct, responsive and unavailable before publication at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/downloads?platform=android");
    const list = page.getByRole("list", { name: "Project packages" });
    await expect(list.getByRole("listitem")).toHaveCount(4);
    const low = list.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "MH3 - Low Spec", exact: true }) });
    await expect(low.getByText("32-bit · ARMv7 APK", { exact: true })).toBeVisible();
    await expect(low.getByText(/Experimental/)).toBeVisible();
    await expect(low.getByText("Release pending", { exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/download/mh-tri-low-spec/"]')).toHaveCount(0);
    await expect(list.getByText("64-bit · ARM64 APK", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("downloads.png"), fullPage: true });
    await low.getByRole("link", { name: "View MH3 - Low Spec project" }).click();
    await expect(page.getByRole("heading", { name: "MH3 - Low Spec", exact: true })).toBeVisible();
    await expect(page.getByText(/32-bit-only|64-bit-only Android/)).toBeVisible();
    await expect(page.getByRole("link", { name: "MH Tri — Rowell", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("project.png"), fullPage: true });
    expect((await request.head("/download/mh-tri-low-spec/android")).status()).toBe(503);
    expect((await request.head("/download/mh-tri-low-spec/windows")).status()).toBe(404);
    if (width === 390) expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
