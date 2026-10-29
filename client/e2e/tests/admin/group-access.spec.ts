import { DATA_SOURCES } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, execute, renameQuery, selectOptions, setSql, tableRows } from "../../support/ui";
import {
  addToGroup,
  createUser,
  findRow,
  listRows,
  loginState,
  menuItem,
  NO_PERMISSION,
  pageAs,
  removeUser,
  runSqlViaApi,
  type StorageState,
  type TestUser,
} from "./helpers";

const CHANNEL_SQL = "select channel, count(*) as orders from orders group by 1 order by 1";

/**
 * The admin sets up a group through the UI and changes its access; a member of only that group sees the effect.
 * The steps build on each other: the group made in the first test is used by the following ones.
 */
test.describe("A group's access to a data source", () => {
  test.describe.configure({ mode: "serial" });
  let user: TestUser;
  let session: StorageState;
  let groupId = 0;
  const groupName = uniqueName("A access group");
  const adminQuery = { id: 0, name: uniqueName("A access pg query") };
  let mysqlQueryId: number | null = null;
  const createdByUser: number[] = [];

  test.beforeAll(async ({ api, seed, browser, baseURL }) => {
    user = await createUser(api, { prefix: "A Access" });
    session = await loginState(browser, baseURL, user);
    adminQuery.id = (
      await createQueryViaApi(api, {
        name: adminQuery.name,
        dataSourceId: seed.dataSources.postgres,
        sql: "select count(*) as cities from cities",
      })
    ).id;
    if (seed.dataSources.mysql !== null) {
      mysqlQueryId = (
        await createQueryViaApi(api, {
          name: uniqueName("A access mysql query"),
          dataSourceId: seed.dataSources.mysql,
          sql: "select count(*) as cities from cities",
        })
      ).id;
    }
  });

  test.afterAll(async ({ api }) => {
    for (const id of [adminQuery.id, mysqlQueryId, ...createdByUser]) {
      if (id) {
        await api.delete(`/api/queries/${id}`).catch(() => undefined);
      }
    }
    await removeUser(api, user.id);
    if (groupId) {
      await api.delete(`/api/groups/${groupId}`).catch(() => undefined);
    }
  });

  test("the admin creates a group with a member and a view-only data source, and takes the member out of default", async ({
    page,
    api,
    seed,
  }) => {
    await page.goto("/groups");
    await page.getByRole("button", { name: /New Group/ }).click();
    await page.getByPlaceholder("Group Name").fill(groupName);
    await page.locator(".ant-modal-footer .ant-btn-primary").click();
    await page.waitForURL(/\/groups\/\d+$/);
    groupId = Number(page.url().match(/\/groups\/(\d+)/)?.[1]);

    await addToGroup(page, /Add Members/, user.name, user.name);
    await expect(listRows(page).filter({ hasText: user.email })).toHaveCount(1);

    await menuItem(byTest(page, "Group"), /Data Sources/).click();
    await addToGroup(page, /Add Data Sources/, "postg", DATA_SOURCES.postgres);
    const row = listRows(page).filter({ hasText: DATA_SOURCES.postgres });
    const permissions = row.getByRole("button", { name: "Permissions" });
    await expect(permissions).toHaveText(/Full Access/);
    await permissions.click();
    await page
      .locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item", { hasText: "View Only" })
      .click();
    await expect(permissions).toHaveText(/View Only/);
    await page.reload();
    await expect(permissions).toHaveText(/View Only/);
    expect(await api.get(`/api/groups/${groupId}/data_sources`)).toMatchObject([
      { id: seed.dataSources.postgres, view_only: true },
    ]);

    // New users are members of "default", which may use every data source: take the user out of it
    const defaultGroup = (await api.get("/api/groups")).find((g: { name: string }) => g.name === "default");
    await page.goto(`/groups/${defaultGroup.id}`);
    const member = await findRow(page, user.email);
    await member.getByRole("button", { name: "Remove" }).click();
    await expect(member).toHaveCount(0);
    expect((await api.get(`/api/users/${user.id}`)).groups).toEqual([groupId]);
  });

  test("with view-only access the member is offered no data source for a new query", async ({
    browser,
    guard,
    baseURL,
  }) => {
    const userPage = await pageAs(browser, guard, baseURL, session);
    await userPage.goto("/queries/new");
    await expect(userPage.locator(".query-source-alerts")).toContainText(
      "Looks like no data sources were created yet or none of them available to the group(s) you're member of."
    );
  });

  test("after the admin switches the group to Full Access the member can create and run queries on that source only", async ({
    page,
    browser,
    guard,
    baseURL,
    api,
    seed,
  }) => {
    await page.goto("/groups");
    const group = await findRow(page, groupName);
    await group.getByRole("link", { name: "Data Sources" }).click();
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/data_sources$`));
    const permissions = listRows(page)
      .filter({ hasText: DATA_SOURCES.postgres })
      .getByRole("button", { name: "Permissions" });
    await permissions.click();
    await page
      .locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item", { hasText: "Full Access" })
      .click();
    await expect(permissions).toHaveText(/Full Access/);
    await expect.poll(async () => (await api.get(`/api/groups/${groupId}/data_sources`))[0].view_only).toBe(false);

    // The member: exactly the one data source is offered, and a new query on it can be saved and run
    const userPage = await pageAs(browser, guard, baseURL, session);
    await userPage.goto("/queries/new");
    await expect(userPage.locator('[data-test="QueryEditor"] .ace_content')).toBeVisible();
    await expect(userPage.locator(".query-source-alerts")).toHaveCount(0);
    await byTest(userPage, "SelectDataSource").locator(".ant-select-selector").click();
    await expect(selectOptions(userPage)).toHaveText([new RegExp(DATA_SOURCES.postgres)]);
    await selectOptions(userPage).first().click();
    await setSql(userPage, CHANNEL_SQL);
    await byTest(userPage, "SaveButton").click();
    await userPage.waitForURL(/\/queries\/\d+\/source/);
    const queryId = Number(userPage.url().match(/\/queries\/(\d+)/)?.[1]);
    createdByUser.push(queryId);
    const name = uniqueName("A access member query");
    await renameQuery(userPage, name);
    expect((await execute(userPage)).error).toBeNull();
    const expected = await runSqlViaApi(api, seed.dataSources.postgres, CHANNEL_SQL);
    expect(expected.length).toBeGreaterThan(1);
    // (the table has an empty filler column after the data)
    expect((await tableRows(userPage)).map((row) => row.slice(0, 2))).toEqual(
      expected.map((row) => [String(row.channel), String(row.orders)])
    );
    expect(await api.get(`/api/queries/${queryId}`)).toMatchObject({
      name,
      query: CHANNEL_SQL,
      data_source_id: seed.dataSources.postgres,
      user: { id: user.id },
    });

    // Someone else's query: changed SQL now runs, but it still cannot be saved
    await userPage.goto(`/queries/${adminQuery.id}/source`);
    await expect(userPage.locator('[data-test="QueryEditor"] .ace_content')).toBeVisible();
    await setSql(userPage, "select 42 as answer");
    expect((await execute(userPage)).error).toBeNull();
    expect((await tableRows(userPage)).map((row) => row[0])).toEqual(["42"]);
    await expect(byTest(userPage, "SaveButton")).toHaveCount(0);

    // Sources that are not in the group stay closed
    if (mysqlQueryId) {
      await userPage.goto(`/queries/${mysqlQueryId}`);
      await expect(byTest(userPage, "ErrorMessage")).toContainText(NO_PERMISSION);
    }
  });
});
