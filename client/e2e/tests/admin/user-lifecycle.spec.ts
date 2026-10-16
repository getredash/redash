import { expect, mailbox, test } from "../../support/fixtures";
import { byTest, dismissToasts, toast } from "../../support/ui";
import {
  createUser,
  linkPath,
  listRows,
  loginAs,
  menuItem,
  newAnonPage,
  removeUser,
  sessionOf,
  submitLogin,
  type TestUser,
  uniqueEmail,
  waitForMails,
  LOAD_TIMEOUT,
} from "./helpers";

const FORGOT_ANSWER =
  "If we found an account associated with that email address, you will find an email from us in your inbox shortly.";

test.describe("Disabling and enabling a user", () => {
  test.describe.configure({ mode: "serial" });
  let user: TestUser;
  test.beforeAll(async ({ api }) => {
    user = await createUser(api, { prefix: "A Disabled" });
  });
  test.afterAll(async ({ api }) => {
    await removeUser(api, user.id);
  });

  test("Disable ends the user's session and refuses the login", async ({ page, browser, guard, baseURL, api }) => {
    const userPage = await loginAs(browser, guard, baseURL, user);
    await userPage.goto("/queries");
    await expect(userPage.getByPlaceholder("Search Queries...")).toBeVisible();

    await page.goto(`/users?q=${encodeURIComponent(user.email)}`);
    const row = listRows(page).filter({ hasText: user.email });
    await row.getByRole("button", { name: "Disable" }).click();
    await expect(toast(page)).toContainText(`User ${user.name} is now disabled.`);
    await expect(row).toHaveCount(0);
    expect((await api.get(`/api/users/${user.id}`)).is_disabled).toBe(true);

    // The user's next click finds the session gone
    await userPage.locator('.desktop-navbar a[href="dashboards"]').first().click();
    await expect(userPage.getByText("Your session has expired. Please login to continue.")).toBeVisible();
    expect((await sessionOf(userPage)).status).toBe(404);

    const loginPage = await newAnonPage(browser, guard, baseURL);
    await loginPage.goto("/login");
    await submitLogin(loginPage, user.email, user.password);
    await expect(loginPage.getByText("Wrong email or password.")).toBeVisible();
    await expect(loginPage).toHaveURL(/\/login/);
  });

  test("the user is listed under Disabled Users with a read-only profile, and can log in again once enabled", async ({
    page,
    browser,
    guard,
    baseURL,
    api,
  }) => {
    await page.goto("/users");
    await menuItem(page, /Disabled Users/).click();
    await expect(page).toHaveURL(/\/users\/disabled/);
    await page.getByPlaceholder("Search...").fill(user.email);
    const row = listRows(page).filter({ hasText: user.email });
    await expect(row).toHaveCount(1);

    await row.getByRole("link", { name: user.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/users/${user.id}$`));
    await expect(page.locator(".profile__h3")).toHaveText(user.name);
    await expect(byTest(page, "Name")).not.toBeEditable();
    await expect(byTest(page, "Email")).not.toBeEditable();
    await expect(page.locator(".col-md-4").getByRole("button")).toHaveText(["Enable User"]);

    await page.goBack();
    await expect(page).toHaveURL(/\/users\/disabled/);
    await row.getByRole("button", { name: "Enable" }).click();
    await expect(toast(page)).toContainText(`User ${user.name} is now enabled.`);
    await expect(row).toHaveCount(0);
    expect((await api.get(`/api/users/${user.id}`)).is_disabled).toBe(false);

    const userPage = await loginAs(browser, guard, baseURL, user);
    expect((await sessionOf(userPage)).email).toBe(user.email);
  });
});

test.describe("Resetting a password", () => {
  const users: TestUser[] = [];
  test.afterAll(async ({ api }) => {
    for (const user of users) {
      await removeUser(api, user.id);
    }
  });

  test("an admin sends a password reset email; its link sets a new password and logs the user in", async ({
    page,
    anonPage,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Reset" });
    users.push(user);
    await page.goto(`/users/${user.id}`);
    await page.getByRole("button", { name: "Send Password Reset Email" }).click();
    await expect(toast(page)).toContainText("Password reset email sent.");
    // The link is only shown in the page when the server could not send the email
    await expect(page.getByLabel("Password link")).toHaveCount(0);
    await dismissToasts(page);

    const mail = await mailbox.waitFor((m) => mailbox.sentTo(user.email)(m) && /reset/i.test(m.subject));
    expect(mail.subject).toBe("Reset your password");
    const resetPath = linkPath(mail, /\/reset\//);

    await anonPage.goto(resetPath);
    await expect(anonPage.getByText("Enter your new password")).toBeVisible();
    await anonPage.locator('input[type="password"]').fill("e2e-throwaway-3");
    await anonPage.click('button[type="submit"]');
    await expect(byTest(anonPage, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
    expect((await sessionOf(anonPage)).email).toBe(user.email);

    // The old password no longer works, the new one does
    await anonPage.context().clearCookies();
    await anonPage.goto("/login");
    await submitLogin(anonPage, user.email, user.password);
    await expect(anonPage.getByText("Wrong email or password.")).toBeVisible();
    await submitLogin(anonPage, user.email, "e2e-throwaway-3");
    await expect(byTest(anonPage, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
  });

  test('"I forgot my password" answers the same for unknown and known addresses and emails a working link', async ({
    anonPage,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Forgot" });
    users.push(user);
    const unknown = uniqueEmail("a-nobody");

    await anonPage.goto("/login");
    await anonPage.getByText("I forgot my password").click();
    await expect(anonPage).toHaveURL(/\/forgot$/);
    await anonPage.fill('input[name="email"]', unknown);
    await anonPage.click('button[type="submit"]');
    await expect(anonPage.getByText(FORGOT_ANSWER)).toBeVisible();

    await anonPage.goto("/forgot");
    await anonPage.fill('input[name="email"]', user.email);
    await anonPage.click('button[type="submit"]');
    await expect(anonPage.getByText(FORGOT_ANSWER)).toBeVisible();

    const [mail] = await waitForMails(user.email, 1);
    expect(mail.subject).toBe("Reset your password");
    // The request for the unknown address was made first; by now its email would have arrived too
    expect(await mailbox.all().then((all) => all.filter(mailbox.sentTo(unknown)))).toEqual([]);

    await anonPage.goto(linkPath(mail, /\/reset\//));
    await expect(anonPage.getByText("Enter your new password")).toBeVisible();
    await anonPage.locator('input[type="password"]').fill("e2e-throwaway-4");
    await anonPage.click('button[type="submit"]');
    await expect(byTest(anonPage, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
    expect((await sessionOf(anonPage)).email).toBe(user.email);

    await byTest(anonPage, "ProfileDropdown").hover();
    await byTest(anonPage, "LogOutButton").click();
    await expect(anonPage).toHaveURL(/\/login/);
    await submitLogin(anonPage, user.email, user.password);
    await expect(anonPage.getByText("Wrong email or password.")).toBeVisible();
    await submitLogin(anonPage, user.email, "e2e-throwaway-4");
    await expect(byTest(anonPage, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
    expect((await sessionOf(anonPage)).email).toBe(user.email);
  });
});
