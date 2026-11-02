import type { Page } from "@playwright/test";
import { expect, mailbox, test, uniqueName } from "../../support/fixtures";
import { byTest, dismissToasts, toast } from "../../support/ui";
import {
  confirmDialog,
  expectNothingFound,
  inviteUserViaApi,
  linkPath,
  listRows,
  menuItem,
  removeUser,
  searchFor,
  sessionOf,
  uniqueEmail,
  waitForMails,
  LOAD_TIMEOUT,
} from "./helpers";

const dialog = (page: Page) => byTest(page, "CreateUserDialog");

async function openNewUserDialog(page: Page) {
  await page.goto("/users");
  await page.getByRole("button", { name: /New User/ }).click();
  await expect(dialog(page)).toBeVisible();
}

/** Invites a user through Settings > Users > New User. */
async function inviteThroughDialog(page: Page, name: string, email: string) {
  await openNewUserDialog(page);
  await byTest(dialog(page), "Name").fill(name);
  await byTest(dialog(page), "Email").fill(email);
  await byTest(page, "SaveUserButton").click();
  await expect(toast(page)).toContainText("Saved.");
  await expect(dialog(page)).toBeHidden();
  await dismissToasts(page);
}

async function userIdByEmail(page: Page, email: string): Promise<number> {
  for (const filter of ["", "&pending=true", "&disabled=true"]) {
    const response = await page.request.get(`/api/users?q=${encodeURIComponent(email)}${filter}`);
    const user = (await response.json()).results.find((u: { email: string }) => u.email === email);
    if (user) {
      return user.id;
    }
  }
  throw new Error(`no user with the email ${email}`);
}

test.describe("Inviting users", () => {
  // Users invited here are removed again, so the users lists of other tests stay short
  const invited: string[] = [];
  test.afterAll(async ({ api }) => {
    for (const email of invited) {
      for (const filter of [{}, { pending: "true" }, { disabled: "true" }] as Record<string, string>[]) {
        const { results } = await api.get("/api/users", { q: email, ...filter });
        for (const user of results.filter((u: { email: string }) => u.email === email)) {
          await removeUser(api, user.id);
        }
      }
    }
  });

  test("the New User dialog validates its fields, then invites the user into the default group", async ({ page }) => {
    const name = uniqueName("A Invited");
    const email = uniqueEmail("a-invited");
    invited.push(email);
    await openNewUserDialog(page);
    await expect(byTest(dialog(page), "Name")).toBeFocused();

    await byTest(page, "SaveUserButton").click();
    await expect(dialog(page).getByText("This field is required.")).toHaveCount(2);

    await byTest(dialog(page), "Name").fill(name);
    await byTest(dialog(page), "Email").fill("not-an-email");
    await byTest(page, "SaveUserButton").click();
    await expect(dialog(page).getByText("This field must be a valid email.")).toBeVisible();
    await expect(dialog(page).getByText("This field is required.")).toHaveCount(0);

    await byTest(dialog(page), "Email").fill(email);
    await byTest(page, "SaveUserButton").click();
    await expect(toast(page)).toContainText("Saved.");
    await expect(dialog(page)).toBeHidden();
    // Mail is configured, so the invitation was sent and no "send this link yourself" dialog appears
    await expect(page.getByText("Email not sent!")).toHaveCount(0);

    await menuItem(page, /Pending Invitations/).click();
    await expect(page).toHaveURL(/\/users\/pending/);
    await searchFor(page, "Search...", email);
    const row = listRows(page).filter({ hasText: email });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(name);
    await expect(row).toContainText("default");

    // Not among the active users yet
    await menuItem(page, /Active Users/).click();
    await searchFor(page, "Search...", email);
    await expectNothingFound(page);
  });

  test("the invitation email has a link that lets the new user set a password and log in", async ({
    page,
    anonPage,
    api,
  }) => {
    const name = uniqueName("A Invited");
    const email = uniqueEmail("a-invited");
    invited.push(email);
    const admin = (await api.get("/api/session")).user;
    await inviteThroughDialog(page, name, email);

    const mail = await mailbox.waitFor(mailbox.sentTo(email));
    expect(mail.subject).toBe(`${admin.name} invited you to join Redash`);
    expect((mail as unknown as { from: { address: string }[] }).from[0].address).toBe("redash@example.com");
    const invitePath = linkPath(mail, /\/invite\//);
    expect(invitePath).toMatch(/^\/invite\/.+/);

    await anonPage.goto(invitePath);
    await expect(anonPage.getByText("Welcome to Redash!")).toBeVisible();
    await anonPage.locator('input[type="password"]').fill("abc");
    await anonPage.click('button[type="submit"]');
    await expect(anonPage.getByText("Password length is too short (<6).")).toBeVisible();
    expect((await sessionOf(anonPage)).email).toBeUndefined();

    await anonPage.locator('input[type="password"]').fill("e2e-throwaway-1");
    await anonPage.click('button[type="submit"]');
    await expect(anonPage).toHaveURL(/:\d+\/$/);
    await expect(byTest(anonPage, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
    expect(await sessionOf(anonPage)).toMatchObject({ status: 200, email, name });

    // The admin now finds the user among the active users, no longer among the pending ones
    await page.goto(`/users?q=${encodeURIComponent(email)}`);
    await expect(listRows(page).filter({ hasText: email })).toHaveCount(1);
    await page.goto(`/users/pending?q=${encodeURIComponent(email)}`);
    await expect(page.getByPlaceholder("Search...")).toHaveValue(email);
    await expectNothingFound(page);
  });

  test("a pending user's profile offers to resend the invitation and shows no invite link while mail works", async ({
    page,
    api,
  }) => {
    const user = await inviteUserViaApi(api, "A Pending");
    invited.push(user.email);
    await page.goto(`/users/pending?q=${encodeURIComponent(user.email)}`);
    await listRows(page).getByRole("link", { name: user.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/users/${user.id}$`));
    await expect(page.getByRole("button", { name: "Resend Invitation" })).toBeVisible();
    // The link is only shown when the server could not send the email
    await expect(page.getByLabel("Password link")).toHaveCount(0);
    await expect(page.getByText(/\/invite\//)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send Password Reset Email" })).toHaveCount(0);
  });

  test("Resend Invitation sends a second email; once accepted, the invitation links are refused", async ({
    page,
    anonPage,
    api,
  }) => {
    const user = await inviteUserViaApi(api, "A Resent");
    invited.push(user.email);
    const [first] = await waitForMails(user.email, 1);

    await page.goto(`/users/${user.id}`);
    await page.getByRole("button", { name: "Resend Invitation" }).click();
    await expect(toast(page)).toContainText("Invitation sent.");
    const mails = await waitForMails(user.email, 2);
    const firstPath = linkPath(first, /\/invite\//);
    const secondPath = linkPath(mails[1], /\/invite\//);
    expect(mails[1].subject).toBe(first.subject);

    await anonPage.goto(secondPath);
    await expect(anonPage.getByText("Welcome to Redash!")).toBeVisible();
    await anonPage.locator('input[type="password"]').fill("e2e-throwaway-1");
    await anonPage.click('button[type="submit"]');
    await expect(byTest(anonPage, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
    expect((await sessionOf(anonPage)).email).toBe(user.email);

    // A used invitation cannot be used again (opened in a browser that is not logged in)
    await anonPage.context().clearCookies();
    for (const path of new Set([firstPath, secondPath])) {
      await anonPage.goto(path);
      await expect(
        anonPage.getByText("This invitation has already been accepted. Please try resetting your password instead.")
      ).toBeVisible();
      await expect(anonPage.locator('input[type="password"]')).toHaveCount(0);
    }
  });

  test("inviting an email address that is already used shows an error and keeps the dialog open", async ({
    page,
    api,
  }) => {
    const existing = await inviteUserViaApi(api, "A Existing");
    invited.push(existing.email);
    await openNewUserDialog(page);
    await byTest(dialog(page), "Name").fill(uniqueName("A Duplicate"));
    await byTest(dialog(page), "Email").fill(existing.email);
    await byTest(page, "SaveUserButton").click();
    await expect(byTest(page, "CreateUserErrorAlert")).toHaveText("Email already taken.");
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(dialog(page)).toBeHidden();
    expect(await userIdByEmail(page, existing.email)).toBe(existing.id);
  });

  test("a pending invitation is deleted without confirmation and its link stops working", async ({
    page,
    anonPage,
    api,
  }) => {
    const user = await inviteUserViaApi(api, "A Deleted");
    const invitePath = linkPath(await mailbox.waitFor(mailbox.sentTo(user.email)), /\/invite\//);

    await page.goto(`/users/pending?q=${encodeURIComponent(user.email)}`);
    const row = listRows(page).filter({ hasText: user.email });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(toast(page)).toContainText(`User ${user.name} has been deleted.`);
    await expect(confirmDialog(page)).toHaveCount(0);
    await expect(row).toHaveCount(0);
    const pending = await api.get("/api/users", { q: user.email, pending: "true" });
    expect(pending.results).toEqual([]);

    await anonPage.goto(invitePath);
    await expect(
      anonPage.getByText("Your invite link is invalid. Bad user id in token. Please ask for a new one.")
    ).toBeVisible();
    await expect(anonPage.locator('input[type="password"]')).toHaveCount(0);
  });
});
