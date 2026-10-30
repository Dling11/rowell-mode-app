import { test, expect } from "@playwright/test";

test("private setup code stays out of URLs and page markup while credentials require confirmation", async ({
  page,
}) => {
  const code = "isolated-setup-code-for-browser-check";
  const urls: string[] = [];
  let submissions = 0;
  page.on("request", (request) => urls.push(request.url()));
  await page.route("**/api/auth/sign-up/email", (route) => {
    submissions++;
    expect(route.request().headers()["x-owner-setup"]).toBe(code);
    expect(route.request().postDataJSON()).toMatchObject({
      username: "rowell",
      password: "isolated-owner-password",
    });
    return route.fulfill({
      status: 503,
      json: { message: "Temporary test failure" },
    });
  });
  await page.goto(`/admin/setup#setup=${code}`);
  await expect(page).toHaveURL(/\/admin\/setup$/);
  expect(await page.content()).not.toContain(code);
  expect(urls.some((url) => url.includes(code))).toBe(false);
  await page
    .getByLabel("Password", { exact: true })
    .fill("isolated-owner-password");
  await page.getByLabel("Confirm password").fill("different-owner-password");
  await page.getByRole("button", { name: "Create owner account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "passwords don’t match",
  );
  expect(submissions).toBe(0);
  await page.getByLabel("Confirm password").fill("isolated-owner-password");
  await page.getByRole("button", { name: "Create owner account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Temporary test failure",
  );
  expect(submissions).toBe(1);
  await expect(
    page.getByRole("button", { name: "Create owner account" }),
  ).toBeEnabled();
});
