import type { Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { byTest, pick, retype } from "../../support/ui";
import {
  addTextboxViaApi,
  addWidgetViaApi,
  applyButton,
  Created,
  confirmButton,
  confirmDialog,
  counterValue,
  createDashboardViaApi,
  dashboardLevel,
  dashboardParameters,
  enableSharing,
  getDashboard,
  gridItems,
  openDashboard,
  openShareDialog,
  openWidgetMenu,
  overlaps,
  plotData,
  type SeededQuery,
  seedQueries,
  settled,
  shownParameters,
  stableBoxes,
  widgetById,
  widgetError,
  widgetRows,
} from "./helpers";

const TEXT_PARAMETER_REFUSAL =
  "For your security, sharing is currently not supported for dashboards containing queries with text parameters. " +
  "Consider changing the text parameters in your query to a different type.";
const UNSAFE_ON_PUBLIC_PAGE =
  "Error running query: This query contains potentially unsafe parameters and cannot be executed on a shared " +
  "dashboard or an embedded visualization.";
const CATEGORIES = ["Hardware", "Services", "Software", "Training"];

/** On the public page the dashboard-level parameters and filters are in boxes above the grid. */
const publicParameters = (page: Page) =>
  page.locator(".container > .tiled").filter({ has: page.locator('[data-test^="ParameterName-"]') });
const publicFilters = (page: Page) => page.locator(".container > .tiled").filter({ has: byTest(page, "Filters") });

const rowsOf = async (page: Page, id: number) => (await widgetRows(widgetById(page, id))).map((row) => row.join("/"));

test.describe("Public dashboard sharing", () => {
  const created = new Created();
  let byCategory: SeededQuery;
  let tableRows: SeededQuery;
  let filtersRevenue: SeededQuery;
  let filtersQuantity: SeededQuery;
  let byChannel: SeededQuery;
  let byCustomer: SeededQuery;
  let divide: SeededQuery;

  test.beforeAll(async ({ api, seed }) => {
    const dataSource = seed.dataSources.postgres;
    byCategory = await seedQueries.byCategory(api, created, dataSource);
    tableRows = await seedQueries.tableRows(api, created, dataSource);
    filtersRevenue = await seedQueries.filtersRevenue(api, created, dataSource);
    filtersQuantity = await seedQueries.filtersQuantity(api, created, dataSource);
    byChannel = await seedQueries.byChannel(api, created, dataSource);
    byCustomer = await seedQueries.byCustomer(api, created, dataSource);
    divide = await seedQueries.divide(api, created, dataSource);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  /** A published dashboard with a chart, a counter, a table with a number parameter and a text box. */
  async function makeMainDashboard(api: RedashApi) {
    const dashboard = await createDashboardViaApi(api, created, "D Shared", { publish: true });
    return {
      ...dashboard,
      bar: await addWidgetViaApi(api, dashboard.id, byCategory.viz.bar, { col: 0, row: 0, sizeX: 6, sizeY: 8 }),
      counter: await addWidgetViaApi(api, dashboard.id, byCategory.viz.counter, { col: 6, row: 0, sizeX: 3, sizeY: 5 }),
      table: await addWidgetViaApi(
        api,
        dashboard.id,
        tableRows.viz.table,
        { col: 0, row: 8, sizeX: 6, sizeY: 12, autoHeight: true },
        dashboardLevel("rows")
      ),
      text: await addTextboxViaApi(api, dashboard.id, "### D shared text\n\nWith **bold**.", {
        col: 6,
        row: 8,
        sizeX: 6,
        sizeY: 4,
      }),
    };
  }

  /** Number parameters only: min_qty and divisor on the dashboard, the dropdown `cat` in its widget. */
  async function makeParametersDashboard(api: RedashApi) {
    const dashboard = await createDashboardViaApi(api, created, "D Shared params", { publish: true });
    return {
      ...dashboard,
      channel: await addWidgetViaApi(
        api,
        dashboard.id,
        byChannel.viz.table,
        { col: 0, row: 0, sizeX: 6, sizeY: 7 },
        {
          ...dashboardLevel("min_qty"),
          cat: { name: "cat", type: "widget-level", mapTo: "cat", value: null, title: "" },
        }
      ),
      divide: await addWidgetViaApi(
        api,
        dashboard.id,
        divide.viz.result,
        { col: 6, row: 0, sizeX: 4, sizeY: 5 },
        dashboardLevel("divisor")
      ),
    };
  }

  const addTextParameterWidget = (api: RedashApi, dashboardId: number) =>
    addWidgetViaApi(
      api,
      dashboardId,
      byCustomer.viz.table,
      { col: 0, row: 30, sizeX: 6, sizeY: 8 },
      dashboardLevel("min_qty", "cust")
    );

  /** Opens the dashboard as the admin, turns sharing on in the dialog and returns the secret address. */
  async function share(page: Page, dashboardId: number) {
    await openDashboard(page, dashboardId);
    return enableSharing(page);
  }

  test("the share dialog turns on public access and Copy puts the secret address on the clipboard", async ({
    page,
    context,
    api,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const dashboard = await makeMainDashboard(api);
    await openDashboard(page, dashboard.id);
    await expect(byTest(page, "OpenShareForm")).not.toHaveClass(/ant-btn-primary/);

    const dialog = await openShareDialog(page);
    await expect(dialog.dialog).toContainText("Allow public access to this dashboard with a secret address.");
    await expect(dialog.alert).toHaveCount(0);
    await expect(dialog.toggle).toBeEnabled();
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "false");
    await expect(dialog.address).toHaveCount(0);

    await dialog.toggle.click();
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "true");
    await expect(dialog.address).toHaveValue(new RegExp(`^${baseURL}/public/dashboards/\\w{20,}\\?org_slug=default$`));
    const address = await dialog.address.inputValue();
    expect((await getDashboard(api, dashboard.id)).public_url).toBe(address);

    await dialog.dialog.locator(".ant-input-group-addon button").click();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toHaveText("Copied!");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);

    await dialog.close();
    // The share button is highlighted while the dashboard is shared
    await expect(byTest(page, "OpenShareForm")).toHaveClass(/ant-btn-primary/);
  });

  test("logged out, the public page shows the widgets and text boxes without navigation or edit controls", async ({
    page,
    anonPage,
    api,
  }) => {
    const dialogs: string[] = [];
    anonPage.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      dialog.dismiss().catch(() => undefined);
    });
    const dashboard = await makeMainDashboard(api);
    const address = await share(page, dashboard.id);

    await anonPage.goto(address);
    await settled(anonPage);
    await expect(anonPage.locator(".page-title, h3").first()).toContainText(dashboard.name);
    await expect(gridItems(anonPage)).toHaveCount(4);
    await expect
      .poll(() => plotData(widgetById(anonPage, dashboard.bar)))
      .toEqual([{ x: CATEGORIES, y: [100671, 102848, 86294, 78980] }]);
    await expect(counterValue(widgetById(anonPage, dashboard.counter))).toHaveText("100,671");
    await expect(widgetById(anonPage, dashboard.table).locator("tbody tr.ant-table-row")).toHaveCount(12);
    expect((await rowsOf(anonPage, dashboard.table))[0]).toBe("1/Hardware/direct/229.54/customer-013");
    const text = widgetById(anonPage, dashboard.text).locator(".markdown");
    await expect(text.locator("h3")).toHaveText("D shared text");
    await expect(text.locator("strong")).toHaveText("bold");
    await expect(anonPage).toHaveURL(/[?&]p_rows=12(&|$)/);

    await expect(anonPage.locator(".desktop-navbar")).toHaveCount(0);
    await expect(byTest(anonPage, "WidgetDropdownButton")).toHaveCount(0);
    await expect(byTest(anonPage, "DashboardMoreButton")).toHaveCount(0);
    await expect(byTest(anonPage, "OpenShareForm")).toHaveCount(0);
    await expect(byTest(anonPage, "RefreshButton")).toHaveCount(0);
    await expect(anonPage.getByRole("button", { name: /^Refresh$/ })).toHaveCount(0);
    expect(overlaps(await stableBoxes(anonPage))).toEqual([]);
    expect(dialogs).toEqual([]);
  });

  test("logged out, a number parameter is changed on the public page", async ({ page, anonPage, api }) => {
    const dashboard = await makeMainDashboard(api);
    const address = await share(page, dashboard.id);
    await anonPage.goto(address);
    await settled(anonPage);
    const table = widgetById(anonPage, dashboard.table);
    await expect(table.locator("tbody tr.ant-table-row")).toHaveCount(12);

    const bar = publicParameters(anonPage);
    await expect.poll(() => shownParameters(bar)).toEqual([["rows", "12"]]);
    await byTest(bar, "ParameterName-rows").locator("input").click();
    await retype(anonPage, "5");
    await applyButton(bar).click();
    await settled(anonPage);
    await expect(table.locator("tbody tr.ant-table-row")).toHaveCount(5);
    expect((await rowsOf(anonPage, dashboard.table))[0]).toBe("1/Hardware/direct/229.54/customer-013");
    await expect(anonPage).toHaveURL(/[?&]p_rows=5(&|$)/);
    await expect(anonPage).toHaveURL(/\/public\/dashboards\//);
  });

  test("logged out, the dashboard-level filter and multi-filter work on the public page", async ({
    page,
    anonPage,
    api,
  }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Shared filters", { publish: true, filters: true });
    const chart = await addWidgetViaApi(api, dashboard.id, filtersRevenue.viz.chart, {
      col: 0,
      row: 0,
      sizeX: 6,
      sizeY: 8,
    });
    const revenue = await addWidgetViaApi(api, dashboard.id, filtersRevenue.viz.table, {
      col: 6,
      row: 0,
      sizeX: 6,
      sizeY: 7,
    });
    const quantity = await addWidgetViaApi(api, dashboard.id, filtersQuantity.viz.table, {
      col: 6,
      row: 7,
      sizeX: 6,
      sizeY: 7,
    });
    const address = await share(page, dashboard.id);

    await anonPage.goto(address);
    await settled(anonPage);
    const shown = async () => ({
      chart: (await plotData(widgetById(anonPage, chart)))[0]?.x,
      revenue: await rowsOf(anonPage, revenue),
      quantity: (await rowsOf(anonPage, quantity))[0],
    });
    await expect.poll(shown).toEqual({
      chart: ["direct", "partner", "web"],
      revenue: ["Hardware/direct/35,405.98/52", "Hardware/partner/31,536.58/49", "Hardware/web/33,728.49/62"],
      quantity: "Hardware/direct/336/2,111.16",
    });

    const bar = publicFilters(anonPage);
    await pick(anonPage, byTest(bar, "FilterName-category::filter"), "Software");
    await expect.poll(async () => (await shown()).revenue[0]).toBe("Software/direct/29,212.55/46");
    expect((await shown()).quantity).toBe("Software/direct/312/1,704.02");

    const channels = byTest(bar, "FilterName-channel::multi-filter");
    await channels.locator(".ant-select-selector").click();
    await anonPage
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [data-test="SelectAllOption"]')
      .click();
    await anonPage.keyboard.press("Escape");
    await channels.locator(".ant-select-selection-item-remove").first().click();
    await expect(channels.locator(".ant-select-selection-item")).toHaveText(["partner", "web"]);
    await expect.poll(shown).toEqual({
      chart: ["partner", "web"],
      revenue: ["Software/partner/36,242.45/59", "Software/web/20,839.19/39"],
      quantity: "Software/partner/346/1,897.25",
    });
  });

  test("logged out, dashboard-level and widget-level parameters work, and a failing widget shows its error", async ({
    page,
    anonPage,
    api,
  }) => {
    const dashboard = await makeParametersDashboard(api);
    const address = await share(page, dashboard.id);
    await anonPage.goto(address);
    await settled(anonPage);
    const channel = widgetById(anonPage, dashboard.channel);
    const counter = widgetById(anonPage, dashboard.divide);
    const bar = publicParameters(anonPage);
    await expect
      .poll(() => shownParameters(bar))
      .toEqual([
        ["min_qty", "1"],
        ["divisor", "4"],
      ]);
    await expect
      .poll(() => rowsOf(anonPage, dashboard.channel))
      .toEqual(["direct/52/35,405.98", "partner/49/31,536.58", "web/62/33,728.49"]);
    await expect(counterValue(counter)).toHaveText("250");

    await byTest(bar, "ParameterName-min_qty").locator("input").click();
    await retype(anonPage, "11");
    await applyButton(bar).click();
    await settled(anonPage);
    await expect.poll(async () => (await rowsOf(anonPage, dashboard.channel))[0]).toBe("direct/9/14,704.87");
    await expect(anonPage).toHaveURL(/[?&]p_min_qty=11(&|$)/);

    await pick(anonPage, byTest(channel, "ParameterName-cat"), "Services");
    await applyButton(channel).click();
    await settled(anonPage);
    await expect.poll(async () => (await rowsOf(anonPage, dashboard.channel))[0]).toBe("direct/10/12,565.09");
    expect(new URL(anonPage.url()).searchParams.get(`p_w${dashboard.channel}_cat`)).toBe("Services");
    await expect(counterValue(counter)).toHaveText("250");

    await byTest(bar, "ParameterName-divisor").locator("input").click();
    await retype(anonPage, "0");
    await applyButton(bar).click();
    await settled(anonPage);
    await expect(widgetError(counter)).toHaveText("Error running query: division by zero");
    expect((await rowsOf(anonPage, dashboard.channel))[0]).toBe("direct/10/12,565.09");
  });

  test("a dashboard with a text parameter cannot be shared", async ({ page, api }) => {
    const dashboard = await makeParametersDashboard(api);
    await addTextParameterWidget(api, dashboard.id);
    await openDashboard(page, dashboard.id);

    const dialog = await openShareDialog(page);
    await expect(dialog.alert).toHaveText(TEXT_PARAMETER_REFUSAL);
    await expect(dialog.toggle).toBeDisabled();
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "false");
    await expect(dialog.address).toHaveCount(0);
    await dialog.close();
    expect((await getDashboard(api, dashboard.id)).public_url).toBeUndefined();
  });

  test("after Remove from Dashboard on the text-parameter widget the dashboard can be shared without a reload", async ({
    page,
    anonPage,
    api,
  }) => {
    const dashboard = await makeParametersDashboard(api);
    const unsafe = await addTextParameterWidget(api, dashboard.id);
    await openDashboard(page, dashboard.id);
    await expect
      .poll(async () => (await shownParameters(dashboardParameters(page))).map(([name]) => name))
      .toEqual(["min_qty", "divisor", "cust"]);

    const menu = await openWidgetMenu(page, widgetById(page, unsafe));
    await menu.getByText("Remove from Dashboard").click();
    await expect(confirmDialog(page).locator(".ant-modal-confirm-content")).toHaveText(
      "Are you sure you want to remove this widget from the dashboard?"
    );
    await confirmButton(page).click();
    await expect(widgetById(page, unsafe)).toHaveCount(0);
    await expect(gridItems(page)).toHaveCount(2);
    // Its parameter leaves the dashboard with it
    await expect
      .poll(async () => (await shownParameters(dashboardParameters(page))).map(([name]) => name))
      .toEqual(["min_qty", "divisor"]);
    expect((await getDashboard(api, dashboard.id)).widgets.map((w) => w.id).sort()).toEqual(
      [dashboard.channel, dashboard.divide].sort()
    );

    const dialog = await openShareDialog(page);
    await expect(dialog.alert).toHaveCount(0);
    await expect(dialog.toggle).toBeEnabled();
    await dialog.toggle.click();
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "true");
    const address = await dialog.address.inputValue();
    await dialog.close();

    await anonPage.goto(address);
    await settled(anonPage);
    await expect(gridItems(anonPage)).toHaveCount(2);
    await expect(counterValue(widgetById(anonPage, dashboard.divide))).toHaveText("250");
  });

  test("a text-parameter widget added to a shared dashboard is refused on the public page", async ({
    page,
    anonPage,
    api,
  }) => {
    const dashboard = await makeMainDashboard(api);
    const address = await share(page, dashboard.id);
    const unsafe = await addWidgetViaApi(
      api,
      dashboard.id,
      byCustomer.viz.table,
      { col: 0, row: 30, sizeX: 6, sizeY: 8 },
      dashboardLevel("min_qty", "cust")
    );

    const refused: string[] = [];
    anonPage.on("response", (response) => {
      if (response.status() === 403) {
        refused.push(new URL(response.url()).pathname);
      }
    });
    await anonPage.goto(address);
    await settled(anonPage);
    await expect(widgetError(widgetById(anonPage, unsafe))).toHaveText(UNSAFE_ON_PUBLIC_PAGE);
    expect(refused).toEqual([`/api/queries/${byCustomer.id}/results`]);
    // The other widgets are not affected
    await expect(counterValue(widgetById(anonPage, dashboard.counter))).toHaveText("100,671");
    await expect(widgetById(anonPage, dashboard.table).locator("tbody tr.ant-table-row")).toHaveCount(12);

    // The owner sees the warning, and can still turn sharing off
    await page.reload();
    await settled(page);
    const dialog = await openShareDialog(page);
    await expect(dialog.alert).toHaveText(TEXT_PARAMETER_REFUSAL);
    await expect(dialog.toggle).toBeEnabled();
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "true");
    await expect(dialog.address).toHaveValue(address);
  });

  test("turning public access off invalidates the address, and turning it on again issues a new one", async ({
    page,
    anonPage,
    api,
  }) => {
    const dashboard = await makeMainDashboard(api);
    const address = await share(page, dashboard.id);
    await anonPage.goto(address);
    await expect(gridItems(anonPage)).toHaveCount(4);

    const dialog = await openShareDialog(page);
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "true");
    await dialog.toggle.click();
    await expect(dialog.toggle).toHaveAttribute("aria-checked", "false");
    await expect(dialog.address).toHaveCount(0);
    await dialog.close();
    await expect(byTest(page, "OpenShareForm")).not.toHaveClass(/ant-btn-primary/);
    expect((await getDashboard(api, dashboard.id)).public_url).toBeUndefined();

    await anonPage.goto(address);
    await expect(anonPage).toHaveURL(/\/login\?next=.*public/);
    await expect(anonPage.locator('input[name="email"]')).toBeVisible();
    await expect(gridItems(anonPage)).toHaveCount(0);

    const newAddress = await enableSharing(page);
    expect(newAddress).toMatch(/\/public\/dashboards\/\w{20,}\?org_slug=default$/);
    expect(newAddress).not.toBe(address);
    await anonPage.goto(newAddress);
    await expect(gridItems(anonPage)).toHaveCount(4);
    // The old address stays dead
    await anonPage.goto(address);
    await expect(anonPage).toHaveURL(/\/login\?next=/);
  });
});
