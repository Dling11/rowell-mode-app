import { test, expect } from "@playwright/test";

test("with animations Off visitors can enable a full loop and keep playback after refresh", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rowell-mode:site-motion", "reduced"));
  await page.clock.install();
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Project spotlight" });
  const heading = () =>
    carousel.locator('[data-active="true"]').getByRole("heading");
  await expect(carousel).toHaveAttribute("data-reduced", "true");
  await expect(carousel).toHaveAttribute("data-playing", "false");
  const play = carousel.getByRole("button", {
    name: "Play spotlight",
    exact: true,
  });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(carousel).toHaveAttribute("data-playing", "true");
  for (const name of [
    "Share Mode",
    "Monster Hunter 4 — Rowell",
    "MH Tri — Rowell",
  ]) {
    await page.clock.fastForward(4900);
    await expect(heading()).toHaveText(name);
  }
  const transition = await carousel
    .locator('[data-active="true"]')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition.split(",").every((value) => value.trim() === "0s")).toBe(
    true,
  );
  await page.reload();
  await expect(carousel).toHaveAttribute("data-playing", "true");
  await page.clock.fastForward(4900);
  await expect(heading()).toHaveText("Share Mode");
  await carousel
    .getByRole("button", { name: "Pause spotlight", exact: true })
    .click();
  await page.reload();
  await expect(carousel).toHaveAttribute("data-playing", "false");
  await page.clock.fastForward(15000);
  await expect(heading()).toHaveText("MH Tri — Rowell");
});

test("Play still works when browser preference storage is blocked", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("rowell-mode:site-motion", "reduced");
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "rowell-mode:spotlight-playback")
        throw new DOMException("Storage blocked", "SecurityError");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "rowell-mode:spotlight-playback")
        throw new DOMException("Storage blocked", "SecurityError");
      return setItem.call(this, key, value);
    };
  });
  await page.clock.install();
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Project spotlight" });
  await carousel
    .getByRole("button", { name: "Play spotlight", exact: true })
    .click();
  await expect(carousel).toHaveAttribute("data-playing", "true");
  await page.clock.fastForward(4900);
  await expect(
    carousel.getByRole("heading", { name: "Share Mode", exact: true }),
  ).toBeVisible();
  await carousel
    .getByRole("button", { name: "Pause spotlight", exact: true })
    .click();
  await expect(carousel).toHaveAttribute("data-playing", "false");
});
