import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const login = "http://127.0.0.1:3105/admin/login";
test("phone PIN keypad supports typing, zero, delete and clear without revealing its value", async ({
  page,
}) => {
  await page.goto(login);
  await page.getByRole("button", { name: "PIN", exact: true }).click();
  const input = page.getByLabel("Owner PIN", { exact: true });
  await expect(input).toHaveAttribute("type", "password");
  for (const digit of [1, 2, 3, 0])
    await page
      .getByRole("button", { name: `Digit ${digit}`, exact: true })
      .click();
  await expect(input).toHaveValue("1230");
  await page.getByRole("button", { name: "Delete last digit" }).click();
  await expect(input).toHaveValue("123");
  await page.getByRole("button", { name: "Clear PIN" }).click();
  await expect(input).toBeEmpty();
  expect(await page.locator("body").innerText()).not.toMatch(
    /enter\s+16|16[ -]*(?:digits|pins)/i,
  );
  await expect(
    page.getByRole("button", { name: "Unlock", exact: true }),
  ).toBeDisabled();
});
test("failed PIN sign-in never opens the welcome entrance", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-in/owner-pin", (route) =>
    route.fulfill({ status: 401, json: { message: "PIN sign-in failed" } }),
  );
  await page.goto(login);
  await page.getByRole("button", { name: "PIN", exact: true }).click();
  await page.getByLabel("Owner PIN").fill("2468024680246802");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "PIN sign-in failed",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("successful PIN response opens the chosen dark entrance and skip reaches the requested destination", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-in/owner-pin", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("http://127.0.0.1:3105/gallery**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<main><h1>Isolated gallery destination</h1></main>",
    }),
  );
  await page.goto(login + "?returnTo=%2Fgallery");
  await page.getByRole("button", { name: "PIN", exact: true }).click();
  await page.getByLabel("Owner PIN").fill("2468024680246802");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  const entrance = page.getByRole("dialog");
  await expect(entrance).toHaveAttribute("data-scene", "red-moon");
  await expect(entrance.getByRole("heading")).toContainText("BOSS ROWELL");
  await entrance.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3105/gallery");
});
test("entrance samples preview without signing in and stay usable with reduced motion on a phone", async ({
  page,
  context,
}) => {
  let signIns = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/sign-in")) signIns++;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(login);
  await page
    .locator("summary")
    .filter({ hasText: "Choose your entrance" })
    .click();
  await page.getByRole("radio", { name: "02 · Red moon" }).check();
  await page.getByRole("button", { name: "Preview entrance" }).click();
  const entrance = page.getByRole("dialog");
  await expect(entrance).toHaveAttribute("data-scene", "red-moon");
  await expect(entrance).toHaveAttribute("data-reduced", "true");
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
  expect(signIns).toBe(0);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.includes("session_token"),
    ),
  ).toHaveLength(0);
  await entrance.getByRole("button", { name: "Close preview" }).click();
  await expect(page).toHaveURL(login);
  await page.getByRole("button", { name: "PIN", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
