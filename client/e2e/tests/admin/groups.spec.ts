import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, dismissToasts, retype, toast } from "../../support/ui";
import {
  confirmDialog,
  createUser,
  findRow,
  listRows,
  menuItem,
  removeUser,
  selectItemsDialog,
  type TestUser,
  uniqueToken,
} from "./helpers";

const createDialog = (page: Page) => page.locator(".ant-modal").filter({ hasText: "Create a New Group" });
const groupTitle = (page: Page) => byTest(page, "Group").locator(".edit-in-place").first();

test.describe("Groups", () => {
  const groups: number[] = [];
  const users: TestUser[] = [];
  const newGroup = async (api: { post: (path: string, data: unknown) => Promise<{ id: number }> }, prefix: string) => {
    const name = uniqueName(prefix);
    const { id } = await api.post("/api/groups", { name });
    groups.push(id);
    return { id, name };
  };
  test.afterAll(async ({ api }) => {
    for (const id of groups) {
      await api.delete(`/api/groups/${id}`).catch(() => undefined);
    }
    for (const user of users) {
      await removeUser(api, user.id);
    }
  });

  test("a group is created from the dialog and renamed in place with Enter, not with Escape", async ({ page, api }) => {
    const name = uniqueName("A group");
    await page.goto("/groups");
    await page.getByRole("button", { name: /New Group/ }).click();
    await expect(createDialog(page).getByPlaceholder("Group Name")).toBeFocused();
    await page.keyboard.type(name);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/groups\/\d+$/);
    const id = Number(page.url().match(/\/groups\/(\d+)/)?.[1]);
    groups.push(id);
    await expect(groupTitle(page)).toHaveText(name);
    expect((await api.get(`/api/groups/${id}`)).name).toBe(name);

    await groupTitle(page).click();
    await retype(page, `${name} renamed`);
    await page.keyboard.press("Enter");
    await expect(groupTitle(page)).toHaveText(`${name} renamed`);
    await expect.poll(async () => (await api.get(`/api/groups/${id}`)).name).toBe(`${name} renamed`);
    await page.reload();
    await expect(groupTitle(page)).toHaveText(`${name} renamed`);

    await groupTitle(page).click();
    await retype(page, "SHOULD NOT BE SAVED");
    await page.keyboard.press("Escape");
    await expect(groupTitle(page)).toHaveText(`${name} renamed`);
    expect((await api.get(`/api/groups/${id}`)).name).toBe(`${name} renamed`);
  });

  test("the New Group dialog refuses an empty name", async ({ page, api }) => {
    knownIssue("group-with-empty-name");
    await page.goto("/groups");
    await page.getByRole("button", { name: /New Group/ }).click();
    await expect(createDialog(page).getByPlaceholder("Group Name")).toBeFocused();
    const request = page
      .waitForResponse((r) => r.url().endsWith("/api/groups") && r.request().method() === "POST", { timeout: 5000 })
      .then(
        (response) => response.json(),
        () => null
      );
    await createDialog(page).locator(".ant-modal-footer .ant-btn-primary").click();
    const created: { id: number } | null = await request;
    if (created) {
      // While the bug exists a nameless group was just created: remove it
      await api.delete(`/api/groups/${created.id}`);
    }
    expect(created, "no group is created from an empty name").toBeNull();
    await expect(createDialog(page)).toBeVisible();
  });

  test("members are added through the dialog's search and removed from the list", async ({ page, api }) => {
    const group = await newGroup(api, "A members group");
    const user = await createUser(api, { prefix: `A Member ${uniqueToken("m")}` });
    users.push(user);
    const dialog = selectItemsDialog(page);
    const found = dialog.locator(".scrollbox").first();
    const staged = dialog.locator(".scrollbox").nth(1);
    const save = dialog.locator(".ant-modal-footer .ant-btn-primary");

    await page.goto(`/groups/${group.id}`);
    await expect(groupTitle(page)).toHaveText(group.name);
    await page
      .getByRole("button", { name: /Add Members/ })
      .first()
      .click();
    await dialog.locator("input").click();
    await page.keyboard.type(`zzznobody${uniqueToken("x")}`);
    await expect(found).toContainText("No items match your search.");
    await expect(save).toBeDisabled();

    await retype(page, user.name);
    await expect(found.locator(".select-items-list")).toHaveCount(1);
    await expect(found.locator(".select-items-list")).toContainText(user.name);

    // Selecting stages the user; clicking the staged user takes it out again
    await found.getByText(user.name).first().click();
    await expect(staged).toContainText(user.name);
    await expect(save).toBeEnabled();
    await staged.getByText(user.name).first().click();
    await expect(staged).not.toContainText(user.name);
    await expect(save).toBeDisabled();
    await found.getByText(user.name).first().click();
    await save.click();
    await expect(dialog).toBeHidden();

    const row = listRows(page).filter({ hasText: user.email });
    await expect(row).toHaveCount(1);
    expect((await api.get(`/api/groups/${group.id}/members`)).map((u: { id: number }) => u.id)).toEqual([user.id]);

    // The dialog now marks the member and does not let it be chosen again
    await page
      .getByRole("button", { name: /Add Members/ })
      .first()
      .click();
    await dialog.locator("input").click();
    await page.keyboard.type(user.name);
    await expect(found.locator(".select-items-list")).toHaveCount(1);
    await expect(found.locator(".select-items-list.disabled")).toHaveCount(1);
    await found.locator(".select-items-list .fa-check, .select-items-list [tabindex]").first().hover();
    await expect(page.locator(".ant-tooltip").filter({ hasText: "Already selected" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    await row.getByRole("button", { name: "Remove" }).click();
    await expect(row).toHaveCount(0);
    expect(await api.get(`/api/groups/${group.id}/members`)).toEqual([]);
    await expect(toast(page)).toHaveCount(0);
  });

  test("data sources are added, switched between View Only and Full Access, and removed", async ({ page, api }) => {
    const group = await newGroup(api, "A sources group");
    const dialog = selectItemsDialog(page);
    const sources = async () =>
      (await api.get(`/api/groups/${group.id}/data_sources`))
        .map((ds: { name: string; view_only: boolean }) => [ds.name, ds.view_only])
        .sort();

    await page.goto(`/groups/${group.id}`);
    await menuItem(byTest(page, "Group"), /Data Sources/).click();
    await expect(page).toHaveURL(new RegExp(`/groups/${group.id}/data_sources$`));
    await page
      .getByRole("button", { name: /Add Data Sources/ })
      .first()
      .click();
    await dialog.locator("input").click();
    await page.keyboard.type("e2e q");
    await expect(dialog.locator(".scrollbox").first().locator(".select-items-list")).toHaveText([
      new RegExp(DATA_SOURCES.queryResults),
    ]);
    await dialog.locator(".scrollbox").first().getByText(DATA_SOURCES.queryResults).click();
    await dialog.locator("input").click();
    await retype(page, "E2E");
    await dialog.locator(".scrollbox").first().getByText(DATA_SOURCES.postgres).click();
    await expect(dialog.locator(".scrollbox").nth(1).locator(".select-items-list")).toHaveCount(2);
    await dialog.locator(".ant-modal-footer .ant-btn-primary").click();
    await expect(dialog).toBeHidden();

    const row = listRows(page).filter({ hasText: DATA_SOURCES.queryResults });
    const permissions = row.getByRole("button", { name: "Permissions" });
    await expect(listRows(page)).toHaveCount(2);
    await expect(permissions).toHaveText(/Full Access/);
    expect(await sources()).toEqual([
      [DATA_SOURCES.postgres, false],
      [DATA_SOURCES.queryResults, false],
    ]);

    await permissions.click();
    await page
      .locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item", { hasText: "View Only" })
      .click();
    await expect(permissions).toHaveText(/View Only/);
    await expect.poll(sources).toEqual([
      [DATA_SOURCES.postgres, false],
      [DATA_SOURCES.queryResults, true],
    ]);
    await page.reload();
    await expect(permissions).toHaveText(/View Only/);

    await permissions.click();
    await page
      .locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item", { hasText: "Full Access" })
      .click();
    await expect(permissions).toHaveText(/Full Access/);
    await expect.poll(sources).toEqual([
      [DATA_SOURCES.postgres, false],
      [DATA_SOURCES.queryResults, false],
    ]);

    await row.getByRole("button", { name: "Remove" }).click();
    await expect(row).toHaveCount(0);
    await expect(listRows(page)).toHaveCount(1);
    await expect.poll(sources).toEqual([[DATA_SOURCES.postgres, false]]);

    // The tabs are pages of their own: Back returns to the previous one
    await menuItem(byTest(page, "Group"), /Members/).click();
    await expect(page).toHaveURL(new RegExp(`/groups/${group.id}$`));
    await expect(page.getByRole("button", { name: /Add Members/ }).first()).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/groups/${group.id}/data_sources$`));
    await expect(listRows(page)).toContainText([DATA_SOURCES.postgres]);
  });

  test("a group is deleted from the list after confirmation, and from its own page", async ({ page, api }) => {
    const first = await newGroup(api, "A doomed group");
    const second = await newGroup(api, "A doomed group");
    const exists = async (id: number) => (await api.get("/api/groups")).some((g: { id: number }) => g.id === id);

    await page.goto("/groups");
    let row = await findRow(page, first.name);
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(confirmDialog(page)).toContainText("Delete Group");
    await expect(confirmDialog(page)).toContainText("Are you sure you want to delete this group?");
    await confirmDialog(page).getByRole("button", { name: "No" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    await expect(row).toHaveCount(1);
    expect(await exists(first.id)).toBe(true);

    await row.getByRole("button", { name: "Delete" }).click();
    await confirmDialog(page).getByRole("button", { name: "Yes" }).click();
    await expect(toast(page)).toContainText("Group deleted successfully.");
    await expect(row).toHaveCount(0);
    expect(await exists(first.id)).toBe(false);
    await dismissToasts(page);

    row = await findRow(page, second.name);
    await row.getByRole("link", { name: second.name }).click();
    await expect(page).toHaveURL(new RegExp(`/groups/${second.id}$`));
    await page.getByRole("button", { name: "Delete Group" }).click();
    await confirmDialog(page).getByRole("button", { name: "Yes" }).click();
    await expect(toast(page)).toContainText("Group deleted successfully.");
    await expect(page).toHaveURL(/\/groups$/);
    await expect(byTest(page, "GroupList")).toBeVisible();
    expect(await exists(second.id)).toBe(false);
  });

  for (const builtin of ["admin", "default"]) {
    test(`the built-in group "${builtin}" cannot be deleted`, async ({ page, api }) => {
      const group = (await api.get("/api/groups")).find((g: { name: string }) => g.name === builtin);
      await page.goto("/groups");
      const row = await findRow(page, builtin, { exact: true });
      const button = row.getByRole("button", { name: "Delete" });
      await expect(button).toBeDisabled();
      await button.hover({ force: true });
      await expect(page.locator(".ant-tooltip").filter({ hasText: "Cannot delete built-in group" })).toBeVisible();

      await page.goto(`/groups/${group.id}`);
      await expect(groupTitle(page)).toHaveText(builtin);
      await expect(page.getByRole("button", { name: /Add Members/ }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Delete Group" })).toHaveCount(0);
    });
  }
});
