import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi, execute, getSql, setSql, tableRows } from "../../support/ui";
import {
  apiStatus,
  createDashboardViaApi,
  createLimitedUser,
  listNames,
  listRows,
  loginState,
  NO_PERMISSION,
  NOTHING_FOUND,
  pageAs,
  removeUser,
  type StorageState,
  type TestUser,
  uniqueToken,
} from "./helpers";

const PG_SQL = "select category, count(*) as orders from orders group by 1 order by 1";
const CATEGORIES = ["Hardware", "Services", "Software", "Training"];

/**
 * A user whose only group has VIEW-ONLY access to the PostgreSQL data source and no access to the others.
 * Everything here is read-only for that user, so all tests share one user and one login.
 */
test.describe("A user limited to one view-only data source", () => {
  let user: TestUser;
  let group: { id: number; name: string };
  let session: StorageState;
  const token = uniqueToken("alim");
  const pgQuery = { id: 0, name: `A ${token} pg orders by category` };
  const mysqlQuery = { id: 0, name: `A ${token} mysql cities` };
  let dashboard: { id: number; name: string } | null = null;

  test.beforeAll(async ({ api, seed, browser, baseURL }) => {
    ({ user, group } = await createLimitedUser(api, seed.dataSources.postgres, { prefix: "A Limited" }));
    session = await loginState(browser, baseURL, user);
    pgQuery.id = (
      await createQueryViaApi(api, { name: pgQuery.name, dataSourceId: seed.dataSources.postgres, sql: PG_SQL })
    ).id;
    if (seed.dataSources.mysql !== null) {
      mysqlQuery.id = (
        await createQueryViaApi(api, {
          name: mysqlQuery.name,
          dataSourceId: seed.dataSources.mysql,
          sql: "select name, country from cities order by name",
        })
      ).id;
      dashboard = await createDashboardViaApi(api, uniqueName("A permissions dashboard"), [pgQuery.id, mysqlQuery.id]);
    }
  });

  test.afterAll(async ({ api }) => {
    if (dashboard) {
      await api.delete(`/api/dashboards/${dashboard.id}`).catch(() => undefined);
    }
    for (const id of [pgQuery.id, mysqlQuery.id].filter(Boolean)) {
      await api.delete(`/api/queries/${id}`).catch(() => undefined);
    }
    await removeUser(api, user.id);
    await api.delete(`/api/groups/${group.id}`).catch(() => undefined);
  });

  test("New Query explains that no data source is available, and offers none", async ({ browser, guard, baseURL }) => {
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto("/queries/new");
    const alerts = page.locator(".query-source-alerts");
    await expect(alerts).toContainText(
      "Looks like no data sources were created yet or none of them available to the group(s) you're member of."
    );
    await expect(alerts).toContainText("Please ask your Redash admin to create one first.");
    // Nothing is selected in the data source selector behind the message
    await expect(byTest(page, "SelectDataSource").locator(".ant-select-selection-item")).toHaveCount(0);

    // The API offers the user exactly one data source, and it is view-only
    const response = await page.request.get("/api/data_sources");
    const sources = (await response.json()).map((ds: { name: string; view_only: boolean }) => [ds.name, ds.view_only]);
    expect(sources).toEqual([[DATA_SOURCES.postgres, true]]);
  });

  test("a query on the view-only source shows its cached result and cannot be renamed or saved", async ({
    browser,
    guard,
    baseURL,
  }) => {
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto(`/queries/${pgQuery.id}`);
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    const rows = await tableRows(page);
    expect(rows.map((row) => row[0])).toEqual(CATEGORIES);

    await page.goto(`/queries/${pgQuery.id}/source`);
    await expect(page.locator('[data-test="QueryEditor"] .ace_content')).toBeVisible();
    await expect(byTest(page, "ExecuteButton")).toBeVisible();
    await expect(byTest(page, "SaveButton")).toHaveCount(0);
    // The title is plain text, not the click-to-edit control the owner gets
    const title = page.locator(".query-page-header .edit-in-place, .page-header--query .edit-in-place").first();
    await expect(title).toHaveText(pgQuery.name);
    await expect(title.locator(".editable")).toHaveCount(0);
    await title.click();
    await expect(title).not.toHaveClass(/active/);
    await expect(title.locator("input, textarea")).toHaveCount(0);
  });

  test("the unchanged query can be re-run, changed SQL is refused and nothing is stored", async ({
    browser,
    guard,
    baseURL,
    api,
  }) => {
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto(`/queries/${pgQuery.id}/source`);
    await expect(page.locator('[data-test="QueryEditor"] .ace_content')).toBeVisible();
    await expect(byTest(page, "TableVisualization")).toBeVisible();

    // View-only access allows refreshing a saved query as it is
    const refreshed = page.waitForResponse(
      (r) => r.url().endsWith(`/api/queries/${pgQuery.id}/results`) && r.request().method() === "POST"
    );
    expect((await execute(page)).error).toBeNull();
    expect((await refreshed).status()).toBe(200);
    expect((await tableRows(page)).map((row) => row[0])).toEqual(CATEGORIES);

    await setSql(page, "select customer, amount from orders limit 5");
    expect(await getSql(page)).toBe("select customer, amount from orders limit 5");
    const refused = page.waitForResponse(
      (r) => r.url().endsWith("/api/query_results") && r.request().method() === "POST"
    );
    const { error } = await execute(page);
    expect((await refused).status()).toBe(403);
    expect(error).toContain("Error running query: You do not have permission to run queries with this data source.");
    expect((await api.get(`/api/queries/${pgQuery.id}`)).query).toBe(PG_SQL);
  });

  test("a query on a data source outside the user's groups is refused and not listed", async ({
    browser,
    guard,
    baseURL,
    seed,
  }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto(`/queries/${mysqlQuery.id}`);
    await expect(byTest(page, "ErrorMessage")).toContainText(NO_PERMISSION);
    await expect(byTest(page, "TableVisualization")).toHaveCount(0);
    expect(await apiStatus(page, "GET", `/api/queries/${mysqlQuery.id}`)).toBe(403);
    expect(await apiStatus(page, "GET", `/api/queries/${mysqlQuery.id}/results.json`)).toBe(403);

    // The token finds the PostgreSQL query only; the MySQL one does not exist for this user
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(1);
    expect(await listNames(page)).toEqual([pgQuery.name]);
    await page.goto(`/queries?q=${encodeURIComponent(`${token} mysql`)}`);
    await expect(page.getByText(NOTHING_FOUND)).toBeVisible();
  });

  test("a dashboard shows the widget of the allowed source and locks the other one", async ({
    browser,
    guard,
    baseURL,
    seed,
  }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto(`/dashboards/${dashboard?.id}`);
    await expect(page.locator(".widget-restricted")).toHaveCount(1);
    await expect(page.locator(".widget-restricted")).toContainText(
      "This widget requires access to a data source you don't have access to."
    );
    await expect(page.locator(".widget-restricted")).not.toContainText(mysqlQuery.name);
    await expect(byTest(page, "TableVisualization")).toHaveCount(1);
    expect((await tableRows(page)).map((row) => row[0])).toEqual(CATEGORIES);
    await expect(page.getByText(pgQuery.name).first()).toBeVisible();

    // The API does not send the restricted widget's query or visualization to this user
    const response = await page.request.get(`/api/dashboards/${dashboard?.id}`);
    const sent = (await response.json()).widgets.map((w: { restricted?: boolean; visualization?: unknown }) => ({
      restricted: !!w.restricted,
      hasVisualization: !!w.visualization,
    }));
    expect(sent).toEqual(
      expect.arrayContaining([
        { restricted: false, hasVisualization: true },
        { restricted: true, hasVisualization: false },
      ])
    );
    expect(sent).toHaveLength(2);
  });

  test("Settings shows no admin pages and the admin URLs answer with the permission page", async ({
    browser,
    guard,
    baseURL,
    api,
  }) => {
    const page = await pageAs(browser, guard, baseURL, session);
    const adminGroup = (await api.get("/api/groups")).find((g: { name: string }) => g.name === "admin");
    await page.goto("/");
    await byTest(page, "SettingsLink").click();
    await expect(byTest(page, "SettingsScreenItem")).toHaveText(["Users", "Groups", "Query Snippets", "Account"]);

    for (const url of ["/data_sources", "/admin/status", "/destinations", `/groups/${adminGroup.id}`]) {
      await page.goto(url);
      await expect(byTest(page, "ErrorMessage"), url).toContainText(NO_PERMISSION);
    }
  });

  test("the users and groups lists are read-only and the admin API refuses the user", async ({
    browser,
    guard,
    baseURL,
    seed,
  }) => {
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto(`/users?q=${encodeURIComponent(user.email)}`);
    const row = listRows(page).filter({ hasText: user.email });
    await expect(row).toHaveCount(1);
    await expect(page.getByRole("button", { name: /New User/ })).toHaveCount(0);
    await expect(row.getByRole("button")).toHaveCount(0);

    // Another user's profile is shown as plain text, with nothing to edit
    await page.goto(`/users/${seed.adminId}`);
    await expect(page.locator(".profile__dl")).toContainText("Email:");
    await expect(page.locator(".profile__container").locator("input, button")).toHaveCount(0);

    // Only the user's own group is listed, without the buttons to create or delete groups
    await page.goto("/groups");
    await expect(listRows(page)).toHaveCount(1);
    await expect(listRows(page)).toContainText(group.name);
    await expect(page.getByRole("button", { name: /New Group/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);

    const refused: [Parameters<typeof apiStatus>[1], string, unknown?][] = [
      ["POST", "/api/users", { name: "A refused", email: "a-refused@example.com" }],
      ["POST", "/api/groups", { name: "A refused group" }],
      ["POST", `/api/users/${seed.adminId}/disable`],
      ["GET", "/api/settings/organization"],
      ["GET", "/api/admin/queries/rq_status"],
      ["GET", `/api/data_sources/${seed.dataSources.queryResults}`],
    ];
    for (const [method, url, data] of refused) {
      expect(await apiStatus(page, method, url, data), `${method} ${url}`).toBe(403);
    }
  });

  test("opening /settings/general as a non-admin shows the permission page", async ({ browser, guard, baseURL }) => {
    knownIssue("non-admin-settings-loads-forever");
    const page: Page = await pageAs(browser, guard, baseURL, session);
    await page.goto("/settings/general");
    await expect(byTest(page, "ErrorMessage")).toContainText(NO_PERMISSION);
  });

  test("opening a data source page as a non-admin shows the permission page", async ({
    browser,
    guard,
    baseURL,
    seed,
  }) => {
    knownIssue("non-admin-settings-loads-forever");
    // While the bug exists the refused request is an unhandled error in the page
    guard.allowPageErrors(/AxiosError: Request failed with status code 403/);
    const page: Page = await pageAs(browser, guard, baseURL, session);
    await page.goto(`/data_sources/${seed.dataSources.postgres}`);
    await expect(byTest(page, "ErrorMessage")).toContainText(NO_PERMISSION);
  });
});
