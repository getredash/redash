import type { Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { byTest } from "../../support/ui";
import {
  addWidgetViaApi,
  Created,
  createDashboardViaApi,
  dashboardLevel,
  fullscreenButton,
  grid,
  gridItems,
  openDashboard,
  openMenu,
  overlaps,
  refreshButton,
  refreshIntervalButton,
  type SeededQuery,
  seedQueries,
  settled,
  stableBoxes,
  widgetById,
} from "./helpers";

interface RefreshDashboard {
  id: number;
  bar: number;
  counter: number;
  table: number;
}

/** Records the "run this query now" requests of the page: one per refreshed widget. */
function watchRefreshes(page: Page) {
  const requests: { query: number; at: number }[] = [];
  page.on("request", (request) => {
    const match = request.url().match(/\/api\/queries\/(\d+)\/results$/);
    if (match && request.method() === "POST" && JSON.parse(request.postData() || "{}").max_age === 0) {
      requests.push({ query: Number(match[1]), at: Date.now() });
    }
  });
  return {
    requests,
    /** The query ids refreshed since the last call, sorted. */
    take: () =>
      requests
        .splice(0)
        .map((request) => request.query)
        .sort((a, b) => a - b),
  };
}

test.describe("Dashboard refresh and fullscreen", () => {
  const created = new Created();
  let byCategory: SeededQuery;
  let tableRows: SeededQuery;

  test.beforeAll(async ({ api, seed }) => {
    byCategory = await seedQueries.byCategory(api, created, seed.dataSources.postgres);
    tableRows = await seedQueries.tableRows(api, created, seed.dataSources.postgres);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  /** A published dashboard with two widgets of one query and one of another. */
  async function makeDashboard(api: RedashApi): Promise<RefreshDashboard> {
    const dashboard = await createDashboardViaApi(api, created, "D Refresh", { publish: true });
    return {
      id: dashboard.id,
      bar: await addWidgetViaApi(api, dashboard.id, byCategory.viz.bar, { col: 0, row: 0, sizeX: 6, sizeY: 8 }),
      counter: await addWidgetViaApi(api, dashboard.id, byCategory.viz.counter, { col: 6, row: 0, sizeX: 3, sizeY: 5 }),
      table: await addWidgetViaApi(
        api,
        dashboard.id,
        tableRows.viz.table,
        { col: 0, row: 8, sizeX: 6, sizeY: 8 },
        dashboardLevel("rows")
      ),
    };
  }

  /** The queries of all widgets, sorted: what one refresh of the whole dashboard must run. */
  const allQueries = () => [byCategory.id, byCategory.id, tableRows.id].sort((a, b) => a - b);

  test("Refresh re-runs the query of every widget", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    const refreshes = watchRefreshes(page);
    await openDashboard(page, dashboard.id);
    // Opening a dashboard shows the cached results of queries without parameters
    expect(refreshes.take().filter((query) => query === byCategory.id)).toEqual([]);

    const spinning = page.waitForSelector(".dashboard-control .zmdi-refresh.zmdi-hc-spin");
    const indicators = page.waitForSelector('.widget-wrapper .tile[data-refreshing="true"]');
    await refreshButton(page).click();
    await spinning;
    await indicators;
    await settled(page);
    await expect(page.locator(".dashboard-control .zmdi-refresh.zmdi-hc-spin")).toHaveCount(0);
    expect(refreshes.take()).toEqual(allQueries());
    for (const id of [dashboard.bar, dashboard.counter, dashboard.table]) {
      await expect(byTest(widgetById(page, id), "RefreshButton")).toContainText(/just now|a few seconds ago/);
    }
  });

  test("the refresh button of a widget re-runs that widget's query only", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    const refreshes = watchRefreshes(page);
    await openDashboard(page, dashboard.id);
    refreshes.take();

    const widget = widgetById(page, dashboard.bar);
    const result = page.waitForResponse(
      (response) => /\/api\/query_results\/\d+/.test(response.url()) && response.request().method() === "GET"
    );
    await byTest(widget, "RefreshButton").click();
    await result;
    await settled(page);
    expect(refreshes.take()).toEqual([byCategory.id]);
  });

  test("the refresh interval menu lists the intervals and sets auto refresh in the address", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    const refreshes = watchRefreshes(page);
    await openDashboard(page, dashboard.id);
    await expect(refreshButton(page)).toHaveText("Refresh");
    refreshes.take();

    await refreshIntervalButton(page).click();
    await expect(openMenu(page).locator("li")).toHaveText([
      "1 minute",
      "5 minutes",
      "10 minutes",
      "30 minutes",
      "1 hour",
      "12 hours",
      "1 day",
    ]);
    await openMenu(page)
      .locator("li")
      .filter({ hasText: /^5 minutes$/ })
      .click();
    await expect(refreshButton(page)).toHaveText("5 minutes");
    await expect(refreshButton(page)).toHaveClass(/ant-btn-primary/);
    await expect(page).toHaveURL(/[?&]refresh=300(&|$)/);
    // Choosing an interval refreshes right away
    await settled(page);
    await expect.poll(() => refreshes.requests.length).toBe(3);
    expect(refreshes.take()).toEqual(allQueries());

    await refreshButton(page).hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toHaveText("Auto Refreshing every 5 minutes");

    await refreshIntervalButton(page).click();
    await openMenu(page).locator("li").filter({ hasText: "Disable auto refresh" }).click();
    await expect(refreshButton(page)).toHaveText("Refresh");
    await expect(refreshButton(page)).not.toHaveClass(/ant-btn-primary/);
    await expect(page).not.toHaveURL(/refresh=/);
  });

  test("auto refresh every minute re-runs all widgets again and again @slow", async ({ page, api }) => {
    test.setTimeout(4 * 60_000);
    const dashboard = await makeDashboard(api);
    const refreshes = watchRefreshes(page);
    await openDashboard(page, dashboard.id);
    refreshes.take();

    await refreshIntervalButton(page).click();
    await openMenu(page)
      .locator("li")
      .filter({ hasText: /^1 minute$/ })
      .click();
    await expect(refreshButton(page)).toHaveText("1 minute");
    await expect(page).toHaveURL(/[?&]refresh=60(&|$)/);
    await expect.poll(() => refreshes.requests.length).toBe(3);
    const setAt = refreshes.requests[0].at;
    refreshes.take();
    await page.mouse.move(700, 500);

    const times: number[] = [];
    for (const round of [1, 2]) {
      await expect
        .poll(() => refreshes.requests.length, { message: `automatic refresh #${round}`, timeout: 80_000 })
        .toBe(3);
      times.push(refreshes.requests[0].at);
      await settled(page);
      expect(refreshes.take()).toEqual(allQueries());
    }
    // One minute after the interval was set, and one minute after that
    for (const [from, to] of [
      [setAt, times[0]],
      [times[0], times[1]],
    ]) {
      expect((to - from) / 1000).toBeGreaterThan(50);
      expect((to - from) / 1000).toBeLessThan(75);
    }
    await expect(gridItems(page)).toHaveCount(3);
  });

  test("?refresh=60 in the address restores auto refresh, and disabling it stops the refreshes @slow", async ({
    page,
    api,
  }) => {
    test.setTimeout(4 * 60_000);
    const dashboard = await makeDashboard(api);
    const refreshes = watchRefreshes(page);
    await openDashboard(page, dashboard.id, "?refresh=60");
    await expect(refreshButton(page)).toHaveText("1 minute");
    await expect(refreshButton(page)).toHaveClass(/ant-btn-primary/);
    refreshes.take();

    await expect.poll(() => refreshes.requests.length, { message: "automatic refresh", timeout: 80_000 }).toBe(3);
    await settled(page);
    expect(refreshes.take()).toEqual(allQueries());

    await refreshIntervalButton(page).click();
    await openMenu(page).locator("li").filter({ hasText: "Disable auto refresh" }).click();
    await expect(refreshButton(page)).toHaveText("Refresh");
    await expect(page).not.toHaveURL(/refresh=/);
    // Longer than the interval was: a real wait, to see that nothing is refreshed any more
    await page.waitForTimeout(70_000);
    expect(refreshes.take()).toEqual([]);
  });

  test("fullscreen hides the navigation and uses the whole width; it survives a reload and can be left", async ({
    page,
    api,
  }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const navbar = page.locator(".desktop-navbar");
    const gridWidth = async () => Math.round((await grid(page).boundingBox())?.width || 0);
    await expect(navbar).toBeVisible();
    const normalWidth = await gridWidth();
    expect(normalWidth).toBeLessThan(1440);

    await fullscreenButton(page).click();
    await expect(page).toHaveURL(/[?&]fullscreen(&|$)/);
    await expect(navbar).toBeHidden();
    await expect(page.locator("body")).toHaveClass(/headless/);
    await expect(fullscreenButton(page)).toHaveClass(/ant-btn-primary/);
    await expect.poll(gridWidth).toBe(1440);
    await expect(gridItems(page)).toHaveCount(3);
    expect(overlaps(await stableBoxes(page))).toEqual([]);

    await page.reload();
    await settled(page);
    await expect(page).toHaveURL(/[?&]fullscreen(&|$)/);
    await expect(navbar).toBeHidden();
    await expect.poll(gridWidth).toBe(1440);

    await fullscreenButton(page).click();
    await expect(page).not.toHaveURL(/fullscreen/);
    await expect(navbar).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/headless/);
    await expect.poll(gridWidth).toBe(normalWidth);
  });
});
