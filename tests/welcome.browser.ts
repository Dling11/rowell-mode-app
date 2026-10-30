import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const login = "http://127.0.0.1:3105/admin/login";

test("red moon supersedes the old saved smoke choice and the name reveals in separate stages", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    localStorage.setItem("rowell-mode:welcome-scene", "smoke"),
  );
  await page.goto(login);
  await page
    .locator("summary")
    .filter({ hasText: "Choose your entrance" })
    .click();
  await expect(
    page.getByRole("radio", { name: "02 · Red moon" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Preview entrance" }).click();
  const entrance = page.getByRole("dialog");
  await expect(entrance).toHaveAttribute("data-ready", "true");
  await expect(entrance).toHaveAttribute("data-motion", "full");
  const letters = entrance.locator("strong span");
  expect(await letters.first().evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await letters.first().evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
  async function at(time: number) {
    await entrance.evaluate((element, time) => {
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = time;
      }
    }, time);
  }
  await at(2000);
  expect(
    Number(
      await letters
        .first()
        .evaluate((element) => getComputedStyle(element).opacity),
    ),
  ).toBe(0);
  await at(6500);
  const first = Number(
    await letters
      .first()
      .evaluate((element) => getComputedStyle(element).opacity),
  );
  const last = Number(
    await letters
      .last()
      .evaluate((element) => getComputedStyle(element).opacity),
  );
  expect(first).toBeGreaterThan(last);
  await at(11000);
  expect(
    Number(
      await letters
        .last()
        .evaluate((element) => getComputedStyle(element).opacity),
    ),
  ).toBe(1);
  await expect(
    entrance.getByRole("heading", { name: "WELCOME BOSS ROWELL" }),
  ).toBeVisible();
});

test("automatic entry waits for the full sequence instead of navigating during the name reveal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.route("**/api/auth/sign-in/owner-pin", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("http://127.0.0.1:3105/gallery**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<main><h1>Isolated gallery</h1></main>",
    }),
  );
  await page.goto(login + "?returnTo=%2Fgallery");
  await page.getByRole("button", { name: "PIN", exact: true }).click();
  await page.getByLabel("Owner PIN").fill("2468024680246802");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-ready", "true");
  await page.clock.fastForward(12000);
  await expect(page).toHaveURL(login + "?returnTo=%2Fgallery");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.fastForward(3200);
  await expect(page).toHaveURL("http://127.0.0.1:3105/gallery");
});

test("a reduced-motion visitor can explicitly play full animation and keep that choice", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(login);
  await page
    .locator("summary")
    .filter({ hasText: "Choose your entrance" })
    .click();
  await page.getByRole("button", { name: "Preview entrance" }).click();
  const entrance = page.getByRole("dialog");
  await expect(entrance).toHaveAttribute("data-motion", "still");
  await entrance.getByRole("button", { name: "Play full animation" }).click();
  await expect(entrance).toHaveAttribute("data-motion", "full");
  await expect(entrance).toHaveAttribute("data-ready", "true");
  expect(
    await entrance
      .locator("strong span")
      .first()
      .evaluate((element) => element.getAnimations().length),
  ).toBeGreaterThan(0);
  await entrance.getByRole("button", { name: "Close preview" }).click();
  await page.reload();
  await page
    .locator("summary")
    .filter({ hasText: "Choose your entrance" })
    .click();
  await expect(page.getByLabel("Entrance animation")).toHaveValue("full");
  await page.getByRole("button", { name: "Preview entrance" }).click();
  await expect(entrance).toHaveAttribute("data-motion", "full");
  await entrance
    .getByRole("button", { name: "Still view", exact: true })
    .click();
  await expect(entrance).toHaveAttribute("data-motion", "still");
});

test("the animated entrance and controls fit phone, landscape and desktop layouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const [width, height] of [
    [320, 844],
    [844, 390],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(login);
    await page
      .locator("summary")
      .filter({ hasText: "Choose your entrance" })
      .click();
    await page.getByRole("button", { name: "Preview entrance" }).click();
    const entrance = page.getByRole("dialog");
    await expect(entrance).toHaveAttribute("data-ready", "true");
    await entrance.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = 11000;
      }
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      entrance.getByRole("heading", { name: "WELCOME BOSS ROWELL" }),
    ).toBeInViewport();
    await expect(
      entrance.getByRole("button", { name: "Close preview" }),
    ).toBeInViewport();
    if (width === 320)
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    if (process.env.HUB_CAPTURE_WELCOME === "1")
      await page.screenshot({
        path: `.private/previews/red-entrance-${width}.png`,
      });
    await entrance.getByRole("button", { name: "Close preview" }).click();
  }
});
