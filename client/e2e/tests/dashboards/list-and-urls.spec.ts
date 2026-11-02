import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest } from "../../support/ui";
import {
  addTextboxViaApi,
  addWidgetViaApi,
  Created,
  createDashboardViaApi,
  dashboardLevel,
  dashboardParameters,
  dashboardTitle,
  getDashboard,
  gridItems,
  NOT_FOUND,
  type SeededQuery,
  seedQueries,
  settled,
  shownParameters,
  widgetById,
} from "./helpers";

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const listRows = (page: Page) => byTest(page, "DashboardLayoutContent").locator("tbody tr.ant-table-row");
const listNames = (page: Page) => listRows(page).locator(".table-main-title");
const searchBox = (page: Page) => page.getByPlaceholder("Search Dashboards...");

test.describe("Dashboards list", () => {
  const created = new Created();
  // Every dashboard of this block has this in its name, so a search for it shows exactly these
  const marker = uniqueName("DList").replace(/ /g, "");
  const tag = `d-tag-${marker.toLowerCase()}`;
  let alpha: { id: number; name: string };
  let beta: { id: number; name: string };
  let gamma: { id: number; name: string };
  let adminName: string;

  test.beforeAll(async ({ api, seed }) => {
    const make = async (name: string, patch: Record<string, unknown>) => {
      const dashboard = await api.post("/api/dashboards", { name: `${marker} ${name}` });
      created.dashboards.push(dashboard.id);
      await api.post(`/api/dashboards/${dashboard.id}`, patch);
      return { id: dashboard.id as number, name: `${marker} ${name}` };
    };
    // Created in this order: the default sort is newest first
    alpha = await make("Alpha", { is_draft: false, tags: [tag] });
    beta = await make("Beta", { tags: [tag] });
    gamma = await make("Gamma", { is_draft: false });
    await api.post(`/api/dashboards/${alpha.id}/favorite`);
    adminName = (await api.get(`/api/users/${seed.adminId}`)).name;
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  test("search narrows the list and shows name, tags, the Unpublished label and the author", async ({ page }) => {
    await page.goto("/dashboards");
    await searchBox(page).click();
    await page.keyboard.type(marker);
    await expect(listNames(page)).toHaveText([gamma.name, beta.name, alpha.name]);
    await expect(page).toHaveURL(new RegExp(`[?&]q=${marker}`));

    const row = (id: number) => listRows(page).filter({ has: byTest(page, `DashboardId${id}`) });
    await expect(row(beta.id)).toContainText("Unpublished");
    await expect(byTest(row(beta.id), "TagLabel")).toHaveText([tag]);
    await expect(row(alpha.id)).not.toContainText("Unpublished");
    await expect(byTest(row(alpha.id), "TagLabel")).toHaveText([tag]);
    await expect(byTest(row(gamma.id), "TagLabel")).toHaveCount(0);
    await expect(row(gamma.id)).toContainText(adminName);

    await searchBox(page).click();
    await page.keyboard.type(" Beta");
    await expect(listNames(page)).toHaveText([beta.name]);
  });

  test("a name in the list opens the dashboard", async ({ page }) => {
    await page.goto(`/dashboards?q=${marker}`);
    await byTest(page, `DashboardId${alpha.id}`).click();
    await expect(page).toHaveURL(new RegExp(`/dashboards/${alpha.id}-${slugOf(alpha.name)}$`));
    await expect(dashboardTitle(page)).toHaveText(alpha.name);
  });

  test("My Dashboards and Favorites show the right dashboards", async ({ page }) => {
    await page.goto(`/dashboards/my?order=-created_at&q=${marker}`);
    await expect(listNames(page)).toHaveText([gamma.name, beta.name, alpha.name]);

    await page.goto(`/dashboards/favorites?q=${marker}`);
    await expect(listNames(page)).toHaveText([alpha.name]);
    await expect(byTest(page, "DashboardLayoutContent").locator("thead th")).toContainText(["Starred At"]);

    // The sidebar switches between the views
    await page.locator(".layout-sidebar, .list-control-t, aside").getByText("All Dashboards").first().click();
    await expect(page).toHaveURL(/\/dashboards(\?|$)/);
  });

  test("a tag in the sidebar filters the list", async ({ page }) => {
    await page.goto("/dashboards");
    const sidebarTag = page.locator(".tags-list .ant-menu-item").filter({ hasText: tag });
    await sidebarTag.click();
    await expect(listNames(page)).toHaveText([beta.name, alpha.name]);
    await expect(sidebarTag).toHaveClass(/ant-menu-item-selected/);

    // Clicking the only selected tag deselects it: dashboards without the tag are listed again
    await sidebarTag.click();
    await expect(sidebarTag).not.toHaveClass(/ant-menu-item-selected/);
    await searchBox(page).click();
    await page.keyboard.type(marker);
    await expect(listNames(page)).toHaveText([gamma.name, beta.name, alpha.name]);
  });

  test("the Name column sorts the list and the order is kept in the URL", async ({ page }) => {
    await page.goto(`/dashboards?order=-created_at&q=${marker}`);
    await expect(listNames(page)).toHaveText([gamma.name, beta.name, alpha.name]);

    const nameHeader = byTest(page, "DashboardLayoutContent").locator("thead th").filter({ hasText: "Name" });
    await nameHeader.click();
    await expect(page).toHaveURL(/[?&]order=name(&|$)/);
    await expect(listNames(page)).toHaveText([alpha.name, beta.name, gamma.name]);

    await nameHeader.click();
    await expect(page).toHaveURL(/[?&]order=-name(&|$)/);
    await expect(listNames(page)).toHaveText([gamma.name, beta.name, alpha.name]);

    // The address alone restores search and order
    await page.goto(`/dashboards?order=name&q=${marker}`);
    await expect(listNames(page)).toHaveText([alpha.name, beta.name, gamma.name]);
    await expect(searchBox(page)).toHaveValue(marker);
  });
});

test.describe("Dashboard addresses", () => {
  const created = new Created();
  let tableRows: SeededQuery;
  let dashboard: { id: number; name: string; slug: string };
  let table: number;

  test.beforeAll(async ({ api, seed }) => {
    tableRows = await seedQueries.tableRows(api, created, seed.dataSources.postgres);
    dashboard = await createDashboardViaApi(api, created, "D Addresses", { publish: true });
    table = await addWidgetViaApi(
      api,
      dashboard.id,
      tableRows.viz.table,
      { col: 0, row: 0, sizeX: 6, sizeY: 12, autoHeight: true },
      dashboardLevel("rows")
    );
    await addTextboxViaApi(api, dashboard.id, "D addresses text", { col: 6, row: 0, sizeX: 6, sizeY: 3 });
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  async function expectDashboard(page: Page, rows = 12) {
    await expect(dashboardTitle(page)).toHaveText(dashboard.name);
    await settled(page);
    await expect(gridItems(page)).toHaveCount(2);
    await expect(widgetById(page, table).locator("tbody tr.ant-table-row")).toHaveCount(rows);
    await expect.poll(() => shownParameters(dashboardParameters(page))).toEqual([["rows", String(rows)]]);
  }

  test("/dashboards/<id>-<slug> opens the dashboard", async ({ page }) => {
    await page.goto(`/dashboards/${dashboard.id}-${slugOf(dashboard.name)}`);
    await expectDashboard(page);
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}-${slugOf(dashboard.name)}\\?p_rows=12$`));
  });

  test("/dashboards/<id> without a slug opens the dashboard", async ({ page }) => {
    await page.goto(`/dashboards/${dashboard.id}`);
    await expectDashboard(page);
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}\\?p_rows=12$`));
  });

  test("/dashboards/<id> with another slug opens the dashboard", async ({ page }) => {
    await page.goto(`/dashboards/${dashboard.id}-something-else`);
    await expectDashboard(page);
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}-something-else\\?p_rows=12$`));
  });

  test("/dashboards/<id>-<slug> with a parameter value applies it", async ({ page }) => {
    await page.goto(`/dashboards/${dashboard.id}-${slugOf(dashboard.name)}?p_rows=4`);
    await expectDashboard(page, 4);
    await expect(page).toHaveURL(/\?p_rows=4$/);
  });

  test("an unknown dashboard id shows the not-found page", async ({ page }) => {
    await page.goto("/dashboards/999999999");
    await expect(page.getByText(NOT_FOUND)).toBeVisible();
    await expect(dashboardTitle(page)).toHaveCount(0);
  });

  test("the legacy /dashboard/<slug> address redirects to the dashboard", async ({ page, api }) => {
    const legacy = await createDashboardViaApi(api, created, "D Legacy first");
    const renamed = uniqueName("D Legacy second");
    await api.post(`/api/dashboards/${legacy.id}`, { name: renamed });

    // The slug is the one of the name the dashboard was created with
    await page.goto(`/dashboard/${slugOf(legacy.name)}`);
    await expect(dashboardTitle(page)).toHaveText(renamed);
    await expect(page).toHaveURL(new RegExp(`/dashboards/${legacy.id}-${slugOf(renamed)}$`));
    expect((await getDashboard(api, legacy.id)).name).toBe(renamed);
  });

  test("the legacy /dashboard/<slug> address works with the slug of the current name of a renamed dashboard", async ({
    page,
    api,
  }) => {
    knownIssue("legacy-dashboard-url-after-rename");
    const legacy = await createDashboardViaApi(api, created, "D Legacy original");
    const renamed = uniqueName("D Legacy renamed");
    await api.post(`/api/dashboards/${legacy.id}`, { name: renamed });

    await page.goto(`/dashboard/${slugOf(renamed)}`);
    await expect(dashboardTitle(page)).toHaveText(renamed);
  });

  test("an unknown legacy slug shows the not-found page", async ({ page }) => {
    await page.goto(`/dashboard/${slugOf(uniqueName("d-no-such-dashboard"))}`);
    await expect(page.getByText(NOT_FOUND)).toBeVisible();
  });
});
