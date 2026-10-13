import type { Page } from "@playwright/test";
import { expect, mailbox, test, uniqueName } from "../../support/fixtures";
import { byTest, dismissToasts, retype, selectOptions, toast } from "../../support/ui";
import {
  confirmDialog,
  createUser,
  loginAs,
  newAnonPage,
  removeUser,
  sessionOf,
  submitLogin,
  type TestUser,
  uniqueEmail,
  LOAD_TIMEOUT,
} from "./helpers";

const profile = (page: Page) => page.locator(".col-md-4");
const saveButton = (page: Page) => profile(page).getByRole("button", { name: "Save", exact: true });

/** Status of an API request authenticated with only the API key (no cookies). */
async function statusWithKey(baseURL: string | undefined, key: string | null): Promise<number> {
  const response = await fetch(`${baseURL}/api/queries?page_size=1${key ? `&api_key=${key}` : ""}`, {
    redirect: "manual",
  });
  if (response.status === 200) {
    expect(await response.json()).toHaveProperty("results");
  }
  return response.status;
}

async function regenerateApiKey(page: Page): Promise<{ oldKey: string; newKey: string }> {
  const field = byTest(page, "ApiKey");
  await expect(field).toHaveValue(/^\w{40}$/);
  const oldKey = await field.inputValue();

  await byTest(page, "RegenerateApiKey").click();
  await expect(confirmDialog(page)).toContainText("Regenerate API Key");
  await expect(confirmDialog(page)).toContainText("Are you sure you want to regenerate?");
  await confirmDialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(confirmDialog(page)).toBeHidden();
  await expect(field).toHaveValue(oldKey);

  await byTest(page, "RegenerateApiKey").click();
  await confirmDialog(page).getByRole("button", { name: "Regenerate" }).click();
  await expect(toast(page)).toContainText("The API Key has been updated.");
  await expect(field).not.toHaveValue(oldKey);
  await expect(field).toHaveValue(/^\w{40}$/);
  return { oldKey, newKey: await field.inputValue() };
}

test.describe("Account page of the logged-in user", () => {
  // Each test changes the account, so each gets its own user
  const users: TestUser[] = [];
  test.afterAll(async ({ api }) => {
    for (const user of users) {
      await removeUser(api, user.id);
    }
  });

  test("the profile menu opens the account page, where the display name can be changed but not emptied", async ({
    browser,
    guard,
    baseURL,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Account" });
    users.push(user);
    const page = await loginAs(browser, guard, baseURL, user);

    await byTest(page, "ProfileDropdown").hover();
    await page.locator(".ant-menu-submenu-popup").getByText("Profile").click();
    await expect(page).toHaveURL(/\/users\/me$/);
    await expect(page.locator(".profile__h3")).toHaveText(user.name);
    // Own groups are shown, not editable; and nobody can disable themselves
    await expect(byTest(page, "Groups")).toHaveText("default");
    await expect(profile(page).locator(".ant-select")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Disable User|Enable User/ })).toHaveCount(0);

    const renamed = `${user.name} renamed`;
    await byTest(page, "Name").click();
    await retype(page, renamed);
    await saveButton(page).click();
    await expect(toast(page)).toContainText("Saved.");
    await expect(page.locator(".profile__h3")).toHaveText(renamed);
    expect((await sessionOf(page)).name).toBe(renamed);
    await dismissToasts(page);

    await byTest(page, "Name").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await saveButton(page).click();
    await expect(profile(page).getByText("This field is required.")).toBeVisible();
    await expect(toast(page)).toHaveCount(0);
    expect((await api.get(`/api/users/${user.id}`)).name).toBe(renamed);
  });

  test("Change Password refuses a wrong current password and too short new ones, then changes it", async ({
    browser,
    guard,
    baseURL,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Password" });
    users.push(user);
    const newPassword = "e2e-throwaway-2";
    const page = await loginAs(browser, guard, baseURL, user);
    await page.goto("/users/me");
    const modal = page.locator(".ant-modal").filter({ hasText: "Change Password" });
    const ok = modal.locator(".ant-modal-footer .ant-btn-primary");

    await byTest(page, "ChangePassword").click();
    await expect(byTest(page, "CurrentPassword")).toBeFocused();
    await byTest(page, "CurrentPassword").fill("not-my-password");
    await byTest(page, "NewPassword").fill(newPassword);
    await byTest(page, "RepeatPassword").fill(newPassword);
    await ok.click();
    await expect(toast(page)).toContainText("Incorrect current password.");
    await expect(modal).toBeVisible();
    await dismissToasts(page);

    await byTest(page, "NewPassword").fill("abc");
    await byTest(page, "RepeatPassword").fill("abd");
    await ok.click();
    await expect(modal.getByText("This field is too short.")).toHaveCount(2);
    await expect(modal).toBeVisible();
    await expect(toast(page)).toHaveCount(0);

    await byTest(page, "CurrentPassword").fill(user.password);
    await byTest(page, "NewPassword").fill(newPassword);
    await byTest(page, "RepeatPassword").fill(newPassword);
    await ok.click();
    await expect(toast(page)).toContainText("Saved.");
    await expect(modal).toBeHidden();

    // The browser that changed the password stays logged in
    await page.reload();
    await expect(page.locator(".profile__h3")).toHaveText(user.name);
    expect((await sessionOf(page)).email).toBe(user.email);

    // A browser that is not logged in: the old password is refused, the new one works
    const other = await newAnonPage(browser, guard, baseURL);
    await other.goto("/login");
    await submitLogin(other, user.email, user.password);
    await expect(other.getByText("Wrong email or password.")).toBeVisible();
    await expect(other).toHaveURL(/\/login/);
    await submitLogin(other, user.email, newPassword);
    await expect(byTest(other, "ProfileDropdown")).toBeVisible({ timeout: LOAD_TIMEOUT });
    expect((await sessionOf(other)).email).toBe(user.email);
  });

  test("Regenerate API Key asks for confirmation; the new key works and the old one stops working", async ({
    browser,
    guard,
    baseURL,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Api Key" });
    users.push(user);
    const page = await loginAs(browser, guard, baseURL, user);
    await page.goto("/users/me");

    const { oldKey, newKey } = await regenerateApiKey(page);
    expect(await statusWithKey(baseURL, newKey)).toBe(200);
    expect(await statusWithKey(baseURL, oldKey)).toBe(404);
    expect(await statusWithKey(baseURL, null)).toBe(404);

    await page.reload();
    await expect(byTest(page, "ApiKey")).toHaveValue(newKey);
  });
});

test.describe("An admin on another user's profile", () => {
  const users: TestUser[] = [];
  const groups: number[] = [];
  test.afterAll(async ({ api }) => {
    for (const user of users) {
      await removeUser(api, user.id);
    }
    for (const id of groups) {
      await api.delete(`/api/groups/${id}`).catch(() => undefined);
    }
  });

  test("name and email are edited; a used or invalid email is refused; the new address gets a verification email", async ({
    page,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Edited" });
    const other = await createUser(api, { prefix: "A Other" });
    users.push(user, other);
    const newName = uniqueName("A Edited again");
    const newEmail = uniqueEmail("a-edited-again");

    // Reached from the users list
    await page.goto(`/users?q=${encodeURIComponent(user.email)}`);
    await byTest(page, "UserList").getByRole("link", { name: user.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/users/${user.id}$`));
    await expect(byTest(page, "Email")).toHaveValue(user.email);

    await byTest(page, "Name").click();
    await retype(page, newName);
    await byTest(page, "Email").click();
    await retype(page, newEmail);
    await saveButton(page).click();
    await expect(toast(page)).toContainText("Saved.");
    await expect(page.locator(".profile__h3")).toHaveText(newName);
    expect(await api.get(`/api/users/${user.id}`)).toMatchObject({
      name: newName,
      email: newEmail,
      is_email_verified: false,
    });
    const mail = await mailbox.waitFor(mailbox.sentTo(newEmail));
    expect(`${mail.subject} ${mail.text}`).toMatch(/verify your email address/i);
    await dismissToasts(page);

    await byTest(page, "Email").click();
    await retype(page, other.email);
    await saveButton(page).click();
    await expect(toast(page)).toContainText("Email already taken.");
    await dismissToasts(page);

    await byTest(page, "Email").click();
    await retype(page, "nope");
    await saveButton(page).click();
    await expect(profile(page).getByText("This field must be a valid email.")).toBeVisible();
    await expect(toast(page)).toHaveCount(0);
    expect((await api.get(`/api/users/${user.id}`)).email).toBe(newEmail);
  });

  test("groups are added and removed with the Groups field, and at least one group is required", async ({
    page,
    api,
  }) => {
    const user = await createUser(api, { prefix: "A Grouped" });
    users.push(user);
    const group = await api.post("/api/groups", { name: uniqueName("A extra group") });
    groups.push(group.id);
    // `groups` of a user in the API is the list of group ids
    const groupIds = async (): Promise<number[]> =>
      [...(await api.get(`/api/users/${user.id}`)).groups].sort((a: number, b: number) => a - b);
    const [defaultGroupId] = await groupIds();
    const select = profile(page).locator(".ant-select");
    const chosen = select.locator(".ant-select-selection-item");

    await page.goto(`/users/${user.id}`);
    await expect(chosen).toHaveText(["default"]);
    await select.locator(".ant-select-selector").click();
    await selectOptions(page).filter({ hasText: group.name }).click();
    await page.keyboard.press("Escape");
    await saveButton(page).click();
    await expect(toast(page)).toContainText("Saved.");
    expect(await groupIds()).toEqual([defaultGroupId, group.id].sort((a, b) => a - b));
    await dismissToasts(page);

    await chosen.filter({ hasText: group.name }).locator(".ant-select-selection-item-remove").click();
    await saveButton(page).click();
    await expect(toast(page)).toContainText("Saved.");
    expect(await groupIds()).toEqual([defaultGroupId]);
    await dismissToasts(page);

    await chosen.locator(".ant-select-selection-item-remove").click();
    await expect(chosen).toHaveCount(0);
    await saveButton(page).click();
    await expect(profile(page).getByText("This field is required.")).toBeVisible();
    await expect(toast(page)).toHaveCount(0);
    expect(await groupIds()).toEqual([defaultGroupId]);
  });

  test("the other user's API key can be regenerated", async ({ page, api, baseURL }) => {
    const user = await createUser(api, { prefix: "A Api Key" });
    users.push(user);
    await page.goto(`/users/${user.id}`);
    const { oldKey, newKey } = await regenerateApiKey(page);
    expect(await statusWithKey(baseURL, newKey)).toBe(200);
    expect(await statusWithKey(baseURL, oldKey)).toBe(404);
    expect((await api.get(`/api/users/${user.id}`)).api_key).toBe(newKey);
  });
});
