import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi } from "../../support/ui";
import { atPath, createDashboardViaApi, expectNames, listRows, NOT_FOUND, uniqueToken } from "./helpers";

test.describe("Client-side routing", () => {
  const token = uniqueToken("art");
  const query = { id: 0, name: `A ${token} routing query` };
  const dashboard = { id: 0, name: `A ${token} routing dashboard` };
  let groupId = 0;

  test.beforeAll(async ({ api, seed }) => {
    query.id = (
      await createQueryViaApi(api, { name: query.name, dataSourceId: seed.dataSources.postgres, sql: "select 1 as a" })
    ).id;
    dashboard.id = (await createDashboardViaApi(api, dashboard.name, [query.id])).id;
    groupId = (await api.post("/api/groups", { name: uniqueName("A routing group") })).id;
    await api.post(`/api/groups/${groupId}/data_sources`, { data_source_id: seed.dataSources.postgres });
    await api.post(`/api/queries/${query.id}/favorite`);
  });
  test.afterAll(async ({ api }) => {
    await api.delete(`/api/dashboards/${dashboard.id}`).catch(() => undefined);
    await api.delete(`/api/queries/${query.id}`).catch(() => undefined);
    await api.delete(`/api/groups/${groupId}`).catch(() => undefined);
  });

  test("Back and Forward walk through the visited pages, each with its content", async ({ page }) => {
    const navbar = page.locator(".desktop-navbar");
    const content = {
      dashboards: page.getByPlaceholder("Search Dashboards..."),
      queries: page.getByPlaceholder("Search Queries..."),
      alerts: page
        .getByRole("link", { name: /New Alert/ })
        .or(page.getByRole("button", { name: /New Alert/ }))
        .first(),
      dashboard: byTest(page, "TableVisualization"),
    };
    await page.goto("/");
    await navbar.locator('a[href="queries"]').click();
    await expect(content.queries).toBeVisible();
    await navbar.locator('a[href="alerts"]').click();
    await expect(content.alerts).toBeVisible();
    await navbar.locator('a[href="dashboards"]').click();
    await content.dashboards.fill(token);
    await expect(page).toHaveURL(new RegExp(`/dashboards\\?.*q=${token}`));
    await listRows(page).getByRole("link", { name: dashboard.name }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}-`));
    await expect(content.dashboard).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/dashboards\\?.*q=${token}`));
    await expectNames(page, [dashboard.name]);
    await page.goBack();
    await expect(page).toHaveURL(atPath("/alerts"));
    await expect(content.alerts).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(atPath("/queries"));
    await expect(content.queries).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(atPath("/alerts"));
    await expect(content.alerts).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/dashboards\\?.*q=${token}`));
    await expectNames(page, [dashboard.name]);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}-`));
    await expect(content.dashboard).toBeVisible();
  });

  test("one press of Back returns from a query opened in the list", async ({ page }) => {
    knownIssue("query-page-double-history-entry");
    await page.goto(`/queries?q=${token}`);
    await listRows(page).getByRole("link", { name: query.name }).click();
    await expect(page).toHaveURL(new RegExp(`/queries/${query.id}$`));
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/queries\?/, { timeout: 5000 });
  });

  test("deep URLs render after a hard reload", async ({ page, seed }) => {
    const title = (text: string) => page.getByText(text).first();
    const pages: [string, () => ReturnType<typeof page.locator>][] = [
      [`/queries/${query.id}/source`, () => page.locator('[data-test="QueryEditor"] .ace_content')],
      [`/queries/${query.id}`, () => byTest(page, "TableVisualization")],
      [`/dashboards/${dashboard.id}`, () => byTest(page, "TableVisualization")],
      [`/groups/${groupId}/data_sources`, () => listRows(page).filter({ hasText: "E2E PostgreSQL" })],
      [`/users/${seed.adminId}`, () => byTest(page, "ApiKey")],
      [`/queries/favorites?order=name&page_size=5&q=${token}`, () => listRows(page).filter({ hasText: query.name })],
      ["/settings/general", () => byTest(page, "OrganizationSettingsSaveButton")],
      ["/alerts/new", () => byTest(page, "QuerySelector")],
      [`/queries/my?q=${token}`, () => listRows(page).filter({ hasText: query.name })],
    ];
    for (const [url, content] of pages) {
      await page.goto(url);
      await expect(content().first(), url).toBeVisible();
      await page.reload();
      await expect(content().first(), `${url} after a reload`).toBeVisible();
      await expect(byTest(page, "ErrorMessage"), url).toHaveCount(0);
      expect(new URL(page.url()).pathname, url).toMatch(new RegExp(`^${url.split("?")[0]}`));
    }
    await expect(title(query.name)).toBeVisible();
    // The sort order and page size given in the URL were kept through the reloads of the favorites list
    await page.goto(`/queries/favorites?order=name&page_size=5&q=${token}`);
    await expect(listRows(page).filter({ hasText: query.name })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("order")).toBe("name");
    expect(new URL(page.url()).searchParams.get("page_size")).toBe("5");
  });
});

test.describe("Unknown URLs", () => {
  test("an unknown route shows the not-found message, without the navigation bar", async ({ page }) => {
    for (const url of ["/this/page/does/not/exist", "/api/nope"]) {
      await page.goto(url);
      await expect(byTest(page, "ErrorMessage"), url).toContainText(NOT_FOUND);
      await expect(page.locator(".desktop-navbar"), url).toHaveCount(0);
    }
  });

  test("an unknown id shows the not-found message inside the normal layout", async ({ page }) => {
    for (const url of [
      "/queries/99999999",
      "/dashboards/99999999",
      "/dashboards/99999999-nope",
      "/users/99999999",
      "/alerts/99999999",
      "/data_sources/99999999",
    ]) {
      await page.goto(url);
      await expect(byTest(page, "ErrorMessage"), url).toContainText(NOT_FOUND);
      await expect(page.locator(".desktop-navbar"), url).toBeVisible();
    }
    // The navigation still works from there
    await page.locator('.desktop-navbar a[href="queries"]').click();
    await expect(page).toHaveURL(atPath("/queries"));
    await expect(page.getByPlaceholder("Search Queries...")).toBeVisible();
  });

  test("a trailing slash or other letter case still reaches the page", async ({ page }) => {
    for (const url of ["/queries/", "/Queries"]) {
      await page.goto(url);
      await expect(page.getByPlaceholder("Search Queries..."), url).toBeVisible();
    }
    await page.goto("/queries/new/");
    await expect(page.locator('[data-test="QueryEditor"] .ace_content')).toBeVisible();
  });

  test("the URL of a deleted group shows the not-found message", async ({ page, api, guard }) => {
    knownIssue("missing-id-returns-500");
    // While the bug exists the server answers 500; the test then fails on its own assertion below
    guard.allowServerErrors(/500 GET \/api\/groups\/\d+/);
    const group = await api.post("/api/groups", { name: uniqueName("A deleted group") });
    await api.delete(`/api/groups/${group.id}`);
    await page.goto(`/groups/${group.id}`);
    await expect(byTest(page, "ErrorMessage")).toContainText(NOT_FOUND);
  });

  test("a query URL with a non-numeric id shows the not-found message", async ({ page, guard }) => {
    knownIssue("missing-id-returns-500");
    guard.allowServerErrors(/500 GET \/api\/queries\/abc/);
    await page.goto("/queries/abc");
    await expect(byTest(page, "ErrorMessage")).toContainText(NOT_FOUND);
  });
});
