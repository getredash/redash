import type { Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { byTest, dismissToasts, pick, toast } from "../../support/ui";
import { createUser, loginAs, removeUser, type TestUser } from "./helpers";

const html = (page: Page) => page.locator("html");
const themeSelect = (page: Page) => byTest(page, "ThemeSelect");

test.describe("Theme of the logged-in user", () => {
  const users: TestUser[] = [];
  test.afterAll(async ({ api }) => {
    for (const user of users) {
      await removeUser(api, user.id);
    }
  });

  test("the theme chosen in the profile applies right away, is kept after a reload and can be reset", async ({
    browser,
    guard,
    baseURL,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Theme" });
    users.push(user);
    const page = await loginAs(browser, guard, baseURL, user);

    await page.goto("/users/me");
    await expect(themeSelect(page)).toContainText("Organization default (Light)");
    await expect(html(page)).toHaveAttribute("data-theme", "light");

    await pick(page, themeSelect(page), "Dark");
    await expect(toast(page)).toContainText("Saved.");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect((await api.get(`/api/users/${user.id}`)).theme).toBe("dark");
    await dismissToasts(page);

    // Applied before the app has loaded, and on every page
    await page.goto("/queries");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await page.reload({ waitUntil: "commit" });
    await expect(html(page)).toHaveAttribute("data-theme", "dark");

    // ?theme= overrides it for one page, without changing the preference
    await page.goto("/queries?theme=light");
    await expect(byTest(page, "ProfileDropdown")).toBeVisible();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    expect((await api.get(`/api/users/${user.id}`)).theme).toBe("dark");

    await page.goto("/users/me");
    await pick(page, themeSelect(page), "Organization default");
    await expect(toast(page)).toContainText("Saved.");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    expect((await api.get(`/api/users/${user.id}`)).theme).toBeNull();
  });

  test("System follows the operating system", async ({ browser, guard, baseURL, api }) => {
    const user = await createUser(api, { prefix: "A Theme System" });
    users.push(user);
    await api.post(`/api/users/${user.id}`, { theme: "system" });
    const page = await loginAs(browser, guard, baseURL, user);

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html(page)).toHaveAttribute("data-theme", "light");
  });

  test("an admin changing another user's theme doesn't change their own", async ({ page, api }) => {
    const user = await createUser(api, { prefix: "A Theme Other" });
    users.push(user);

    await page.goto(`/users/${user.id}`);
    await pick(page, themeSelect(page), "Dark");
    await expect(toast(page)).toContainText("Saved.");
    expect((await api.get(`/api/users/${user.id}`)).theme).toBe("dark");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
  });
});
