import type { Locator, Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { byTest, pick, selectOptions } from "../../support/ui";
import {
  addWidgetViaApi,
  Created,
  createDashboardViaApi,
  dashboardFilters,
  doneEditing,
  doneEditingButton,
  getDashboard,
  openDashboard,
  overlaps,
  plotData,
  type SeededQuery,
  seedQueries,
  settled,
  stableBoxes,
  widgetById,
  widgetRows,
} from "./helpers";

const CHANNELS = ["direct", "partner", "web"];
/** Revenue by channel (direct, partner, web) per category, rounded. */
const REVENUE = {
  Hardware: [35406, 31537, 33728],
  Software: [29213, 36242, 20839],
  Services: [37070, 31591, 34187],
  Training: [16994, 22961, 39025],
};

interface FiltersDashboard {
  id: number;
  chart: number;
  revenue: number;
  quantity: number;
}

test.describe("Dashboard filters", () => {
  const created = new Created();
  let filtersRevenue: SeededQuery;
  let filtersQuantity: SeededQuery;

  test.beforeAll(async ({ api, seed }) => {
    filtersRevenue = await seedQueries.filtersRevenue(api, created, seed.dataSources.postgres);
    filtersQuantity = await seedQueries.filtersQuantity(api, created, seed.dataSources.postgres);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  /** A chart and two tables that all have a `category::filter` and a `channel::multi-filter` column. */
  async function makeDashboard(api: RedashApi, dashboardLevelFilters: boolean): Promise<FiltersDashboard> {
    const dashboard = await createDashboardViaApi(api, created, "D Filters", { filters: dashboardLevelFilters });
    return {
      id: dashboard.id,
      chart: await addWidgetViaApi(api, dashboard.id, filtersRevenue.viz.chart, { col: 0, row: 0, sizeX: 6, sizeY: 8 }),
      revenue: await addWidgetViaApi(api, dashboard.id, filtersRevenue.viz.table, {
        col: 6,
        row: 0,
        sizeX: 6,
        sizeY: 7,
      }),
      quantity: await addWidgetViaApi(api, dashboard.id, filtersQuantity.viz.table, {
        col: 6,
        row: 7,
        sizeX: 6,
        sizeY: 7,
      }),
    };
  }

  /** What the three widgets show: the chart's x and y values and the [category, channel] pairs of the tables. */
  async function shown(page: Page, dashboard: FiltersDashboard) {
    const pairs = async (id: number) =>
      (await widgetRows(widgetById(page, id))).map((row) => row.slice(0, 2).join("/"));
    return {
      chart: await plotData(widgetById(page, dashboard.chart)),
      revenue: await pairs(dashboard.revenue),
      quantity: await pairs(dashboard.quantity),
    };
  }

  function expected(category: keyof typeof REVENUE, channels = CHANNELS) {
    const rows = channels.map((channel) => `${category}/${channel}`);
    return {
      chart: channels.length
        ? [{ x: channels, y: channels.map((channel) => REVENUE[category][CHANNELS.indexOf(channel)]) }]
        : [],
      revenue: rows,
      quantity: rows,
    };
  }

  const categoryFilter = (scope: Locator | Page) => byTest(scope, "FilterName-category::filter");
  const channelFilter = (scope: Locator | Page) => byTest(scope, "FilterName-channel::multi-filter");
  const selectedChannels = (scope: Locator | Page) => channelFilter(scope).locator(".ant-select-selection-item");

  async function openChannels(page: Page, scope: Locator | Page) {
    await channelFilter(scope).locator(".ant-select-selector").click();
    await expect(selectOptions(page).first()).toBeVisible();
  }

  test("without dashboard-level filters a widget's filter changes that widget only", async ({ page, api }) => {
    const dashboard = await makeDashboard(api, false);
    await openDashboard(page, dashboard.id);
    await expect(dashboardFilters(page)).toHaveCount(0);
    for (const id of [dashboard.chart, dashboard.revenue, dashboard.quantity]) {
      await expect(byTest(widgetById(page, id), "Filters")).toHaveCount(1);
    }
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Hardware"));

    await pick(page, categoryFilter(widgetById(page, dashboard.chart)), "Software");
    await expect
      .poll(() => shown(page, dashboard))
      .toEqual({ ...expected("Hardware"), chart: expected("Software").chart });
  });

  test("ticking Use Dashboard Level Filters shows one filter bar and is saved", async ({ page, api }) => {
    const dashboard = await makeDashboard(api, false);
    await page.goto(`/dashboards/${dashboard.id}?edit`);
    await expect(doneEditingButton(page)).toBeVisible();
    await settled(page);
    await expect(dashboardFilters(page)).toHaveCount(0);

    await byTest(page, "DashboardFiltersCheckbox").click();
    const bar = dashboardFilters(page);
    await expect(bar).toBeVisible();
    await expect(categoryFilter(bar)).toContainText("Hardware");
    await expect(selectedChannels(bar)).toHaveText(CHANNELS);
    await expect(bar.locator("label")).toHaveText(["Category", "Channel"]);
    await doneEditing(page);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).dashboard_filters_enabled).toBe(true);

    await page.reload();
    await settled(page);
    await expect(dashboardFilters(page)).toBeVisible();
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Hardware"));
    expect(overlaps(await stableBoxes(page))).toEqual([]);
  });

  test("a dashboard-level filter updates every widget", async ({ page, api }) => {
    const dashboard = await makeDashboard(api, true);
    await openDashboard(page, dashboard.id);
    const bar = dashboardFilters(page);
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Hardware"));

    for (const category of ["Services", "Training"] as const) {
      await pick(page, categoryFilter(bar), category);
      await expect
        .poll(() => shown(page, dashboard), { message: `category = ${category}` })
        .toEqual(expected(category));
    }
  });

  test("the dashboard-level multi-filter: Select All, remove a value, toggle a value, Clear", async ({ page, api }) => {
    const dashboard = await makeDashboard(api, true);
    await openDashboard(page, dashboard.id);
    const bar = dashboardFilters(page);
    await pick(page, categoryFilter(bar), "Training");
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Training"));

    await openChannels(page, bar);
    await expect(page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item")).toHaveText([
      "Clear",
      "Select All",
      "Values",
      ...CHANNELS,
    ]);
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [data-test="SelectAllOption"]').click();
    await page.keyboard.press("Escape");
    await expect(selectedChannels(bar)).toHaveText(CHANNELS);
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Training"));

    // The x of a selected value's tag removes it
    await selectedChannels(bar).first().locator(".ant-select-selection-item-remove").click();
    await expect(selectedChannels(bar)).toHaveText(["partner", "web"]);
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Training", ["partner", "web"]));

    // Clicking a selected value in the list deselects it
    await openChannels(page, bar);
    await selectOptions(page).filter({ hasText: /^web$/ }).click();
    await page.keyboard.press("Escape");
    await expect(selectedChannels(bar)).toHaveText(["partner"]);
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Training", ["partner"]));

    await openChannels(page, bar);
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [data-test="ClearOption"]').click();
    await page.keyboard.press("Escape");
    await expect(selectedChannels(bar)).toHaveCount(0);
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Training", []));

    await openChannels(page, bar);
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [data-test="SelectAllOption"]').click();
    await page.keyboard.press("Escape");
    await expect.poll(() => shown(page, dashboard)).toEqual(expected("Training"));
  });
});
