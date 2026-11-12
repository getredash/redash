import { ADMIN } from "../../support/env";
import { expect, test } from "../../support/fixtures";
import { byTest } from "../../support/ui";

test.describe("Login and logout", () => {
  test("the profile menu logs the user out", async ({ page }) => {
    await page.goto("/");
    await byTest(page, "ProfileDropdown").hover();
    await page.getByText("Log out").click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // The session is really gone: the app sends the browser back to the login page
    await page.goto("/queries");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("the login page greets the user", async ({ anonPage }) => {
    await anonPage.goto("/login");
    await expect(anonPage.locator("h3", { hasText: "Login to Redash" })).toBeVisible();
  });

  test("a wrong password shows an error and does not log in", async ({ anonPage }) => {
    await anonPage.goto("/login");
    await anonPage.fill('input[name="email"]', ADMIN.email);
    await anonPage.fill('input[name="password"]', "not-the-password");
    await anonPage.click('button[type="submit"]');
    await expect(anonPage.getByText("Wrong email or password.")).toBeVisible();
    await expect(anonPage).toHaveURL(/\/login/);
  });

  test("logging in from a deep link lands on that page", async ({ anonPage }) => {
    await anonPage.goto("/data_sources");
    await expect(anonPage).toHaveURL(/\/login\?next=.*data_sources/);
    await anonPage.fill('input[name="email"]', ADMIN.email);
    await anonPage.fill('input[name="password"]', ADMIN.password);
    await anonPage.click('button[type="submit"]');
    await expect(anonPage).toHaveURL(/\/data_sources$/);
    await expect(anonPage.getByRole("button", { name: /New Data Source/ })).toBeVisible();
  });
});
