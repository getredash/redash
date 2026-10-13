import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi } from "../../support/ui";
import {
  atPath,
  createDashboardViaApi,
  createUser,
  listRows,
  loginState,
  pageAs,
  postAs,
  removeUser,
  type StorageState,
  type TestUser,
} from "./helpers";

test.describe("Home page", () => {
  // The favorites on the home page are the user's own, so this uses its own user (a member of "default")
  test.describe.configure({ mode: "serial" });
  let user: TestUser;
  let session: StorageState;
  const query = { id: 0, name: uniqueName("A home favorite query") };
  const dashboard = { id: 0, name: uniqueName("A home favorite dashboard") };

  test.beforeAll(async ({ api, seed, browser, baseURL }) => {
    user = await createUser(api, { prefix: "A Home" });
    session = await loginState(browser, baseURL, user);
    query.id = (
      await createQueryViaApi(api, { name: query.name, dataSourceId: seed.dataSources.postgres, sql: "select 1 as a" })
    ).id;
    dashboard.id = (await createDashboardViaApi(api, dashboard.name, [query.id])).id;
  });
  test.afterAll(async ({ api }) => {
    await api.delete(`/api/dashboards/${dashboard.id}`).catch(() => undefined);
    await api.delete(`/api/queries/${query.id}`).catch(() => undefined);
    await removeUser(api, user.id);
  });

  test("a user without favorites sees where favorite dashboards and queries will appear", async ({
    browser,
    guard,
    baseURL,
  }) => {
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto("/");
    const favorites = page.locator(".home-favorites-list");
    await expect(favorites).toContainText("Favorite Dashboards will appear here");
    await expect(favorites).toContainText("Favorite Queries will appear here");
    await expect(favorites.locator(".list-group-item")).toHaveCount(0);

    // The placeholders link to the lists
    await favorites.getByRole("link", { name: "Queries" }).click();
    await expect(page).toHaveURL(atPath("/queries"));
  });

  test("starred dashboards and queries are listed on the home page and open from there", async ({
    browser,
    guard,
    baseURL,
  }) => {
    await postAs(browser, baseURL, session, `/api/queries/${query.id}/favorite`);
    await postAs(browser, baseURL, session, `/api/dashboards/${dashboard.id}/favorite`);
    const page = await pageAs(browser, guard, baseURL, session);
    await page.goto("/");
    const favorites = page.locator(".home-favorites-list");
    await expect(favorites.locator(".list-group-item")).toHaveText([dashboard.name, query.name]);
    await expect(favorites).toContainText("Favorite Dashboards");
    await expect(favorites).toContainText("Favorite Queries");
    await expect(favorites).not.toContainText("will appear here");

    await favorites.getByRole("listitem").filter({ hasText: dashboard.name }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}-`));
    await expect(page.getByText(dashboard.name).first()).toBeVisible();
    await expect(byTest(page, "TableVisualization")).toBeVisible();

    await page.goto("/");
    await favorites.getByRole("listitem").filter({ hasText: query.name }).click();
    await expect(page).toHaveURL(new RegExp(`/queries/${query.id}$`));
    await expect(byTest(page, "TableVisualization")).toBeVisible();
  });
});

test.describe("Navigation bar", () => {
  test("Dashboards, Queries, Alerts and the logo open their pages", async ({ page }) => {
    const navbar = page.locator(".desktop-navbar");
    await page.goto("/users/me");
    await navbar.locator('a[href="dashboards"]').click();
    await expect(page).toHaveURL(atPath("/dashboards"));
    await expect(page.getByPlaceholder("Search Dashboards...")).toBeVisible();
    await expect(page).toHaveTitle(/Dashboards/);

    await navbar.locator('a[href="queries"]').click();
    await expect(page).toHaveURL(atPath("/queries"));
    await expect(page.getByPlaceholder("Search Queries...")).toBeVisible();
    await expect(page).toHaveTitle(/Queries/);

    await navbar.locator('a[href="alerts"]').click();
    await expect(page).toHaveURL(atPath("/alerts"));
    await expect(
      page
        .getByRole("link", { name: /New Alert/ })
        .or(page.getByRole("button", { name: /New Alert/ }))
        .first()
    ).toBeVisible();
    await expect(page).toHaveTitle(/Alerts/);

    await navbar.locator(".desktop-navbar-logo a").click();
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(page.locator(".home-favorites-list")).toBeVisible();
  });

  test("the Create menu opens a new query, the New Dashboard dialog and a new alert", async ({ page }) => {
    await page.goto("/");
    await byTest(page, "CreateButton").hover();
    await byTest(page, "CreateQueryMenuItem").click();
    await expect(page).toHaveURL(/\/queries\/new$/);
    await expect(page.locator('[data-test="QueryEditor"] .ace_content')).toBeVisible();

    await byTest(page, "CreateButton").hover();
    await byTest(page, "CreateDashboardMenuItem").click();
    const dialog = page.locator(".ant-modal").filter({ hasText: "New Dashboard" });
    await expect(dialog.locator("input")).toBeFocused();
    await expect(dialog.locator(".ant-modal-footer .ant-btn-primary")).toBeDisabled();
    await page.keyboard.type("A name that is never saved");
    await expect(dialog.locator(".ant-modal-footer .ant-btn-primary")).toBeEnabled();
    await dialog
      .getByRole("button", { name: /Close|Cancel/ })
      .first()
      .click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/queries\/new$/);

    await byTest(page, "CreateButton").hover();
    await byTest(page, "CreateAlertMenuItem").click();
    await expect(page).toHaveURL(/\/alerts\/new$/);
    await expect(byTest(page, "QuerySelector")).toBeVisible();
  });

  test("Settings opens the data sources and every settings tab switches the page", async ({ page }) => {
    await page.goto("/");
    await byTest(page, "SettingsLink").click();
    await expect(page).toHaveURL(/\/data_sources$/);
    const tabs = byTest(page, "SettingsScreenItem");
    await expect(tabs).toHaveText([
      "Data Sources",
      "Users",
      "Groups",
      "Alert Destinations",
      "Query Snippets",
      "General",
      "Account",
    ]);
    const pages: [string, RegExp, () => ReturnType<typeof page.locator>][] = [
      ["Users", atPath("/users"), () => byTest(page, "UserList")],
      ["Groups", atPath("/groups"), () => byTest(page, "GroupList")],
      [
        "Alert Destinations",
        atPath("/destinations"),
        () => page.getByRole("button", { name: /New Alert Destination/ }),
      ],
      ["Query Snippets", atPath("/query_snippets"), () => page.getByRole("button", { name: /New Query Snippet/ })],
      ["General", /\/settings\/general$/, () => byTest(page, "OrganizationSettingsSaveButton")],
      ["Account", /\/users\/me$/, () => byTest(page, "ApiKey")],
      ["Data Sources", atPath("/data_sources"), () => page.getByRole("button", { name: /New Data Source/ })],
    ];
    for (const [name, url, content] of pages) {
      await tabs.filter({ hasText: new RegExp(`^${name}$`) }).click();
      await expect(page, name).toHaveURL(url);
      await expect(content().first(), name).toBeVisible();
    }
  });

  test("the profile menu offers Profile, System Status and Log out, and shows the version", async ({ page, api }) => {
    const { version } = (await api.get("/api/session")).client_config;
    await page.goto("/");
    await byTest(page, "ProfileDropdown").hover();
    const menu = page.locator(".ant-menu-submenu-popup").filter({ hasText: "Log out" });
    await expect(menu.getByRole("menuitem")).toHaveText(["Profile", "System Status", "Log out"]);
    await expect(menu.locator(".version-info")).toContainText(`Version: ${version}`);

    await menu.getByText("System Status").click();
    await expect(page).toHaveURL(/\/admin\/status$/);
    await expect(
      page
        .getByText("Redis Used Memory")
        .or(page.getByText(/Version/))
        .first()
    ).toBeVisible();

    await byTest(page, "ProfileDropdown").hover();
    await menu.getByText("Profile").click();
    await expect(page).toHaveURL(/\/users\/me$/);
    await expect(byTest(page, "ApiKey")).toBeVisible();
  });

  test("Help opens a drawer with the help site and closes again", async ({ page }) => {
    await page.goto("/");
    await page.locator(".desktop-navbar").getByText("Help").click();
    const drawer = page.locator(".help-drawer .drawer-wrapper");
    await expect(drawer).toBeVisible();
    // The content is the external help site in a frame; only its address is checked, not that it loads
    await expect(drawer.locator("iframe")).toHaveAttribute("src", /^https:\/\/redash\.io\/help/);
    await drawer.locator(".drawer-menu").getByRole("button").last().click();
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/:\d+\/$/);
  });

  test("a narrow window has a menu with all the navigation entries", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto("/queries");
    await expect(page.locator(".desktop-navbar")).toBeHidden();
    await page.locator(".mobile-navbar-toggle-button").click();
    const menu = page.locator(".mobile-navbar-menu");
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Dashboards",
      "Queries",
      "Alerts",
      "Edit Profile",
      "Settings",
      "System Status",
      "Help",
      "Log out",
    ]);
    await menu.getByText("Dashboards").click();
    await expect(page).toHaveURL(atPath("/dashboards"));
    await expect(listRows(page).first().or(page.getByPlaceholder("Search Dashboards...")).first()).toBeVisible();
  });
});
