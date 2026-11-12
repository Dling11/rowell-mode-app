import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [390, 1440])
  test(`MH4U editions have distinct screenshots, provenance and responsive layouts at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [slug, name, source, version] of [
      [
        "mh4u-native",
        "Monster Hunter 4 Ultimate — Native",
        "https://github.com/khorne-hub/4u-native",
        "0.1.9.2",
      ],
      [
        "mh4u",
        "Monster Hunter 4 — Azahar",
        "https://github.com/Dling11/MH4-ULTIMATE",
        "1.0.17",
      ],
    ]) {
      await page.goto(`/projects/${slug}`);
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: "MH4U app edition" })
          .locator('[aria-current="page"]'),
      ).toHaveText(slug === "mh4u-native" ? "Native" : "Azahar");
      await expect(
        page.getByRole("link", { name: /^Source code/ }),
      ).toHaveAttribute("href", source);
      await expect(
        page.getByRole("heading", { name: `Version ${version}` }),
      ).toBeVisible();
      expect(
        await page
          .locator("main img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      ).toBe(true);
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
        path: test.info().outputPath(`${slug}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: /Preview photo/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
