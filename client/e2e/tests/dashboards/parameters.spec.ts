import type { Page } from "@playwright/test";
import { MOD } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, centerOf, pick, retype } from "../../support/ui";
import {
  addWidget,
  addWidgetViaApi,
  applyButton,
  applyDashboardParameter,
  Created,
  counterValue,
  createDashboard,
  createDashboardViaApi,
  dashboardLevel,
  dashboardParameters,
  doneEditing,
  enterEditMode,
  getDashboard,
  mappingPopover,
  mappingRows,
  openDashboard,
  openWidgetMenu,
  refreshButton,
  type SeededQuery,
  seedQueries,
  settled,
  shownParameters,
  typeParameter,
  VIZ,
  widgetById,
  widgetError,
  widgetRows,
} from "./helpers";

/** Rows of "orders by channel" (channel/orders/revenue) for category Hardware, by min_qty. */
const BY_CHANNEL = {
  1: ["direct/52/35,405.98", "partner/49/31,536.58", "web/62/33,728.49"],
  5: ["direct/31/28,994.29", "partner/33/28,079.35", "web/35/26,449.79"],
  9: ["direct/16/19,891.57", "partner/18/19,671.48", "web/14/10,991.59"],
  12: ["direct/6/9,607.81", "partner/7/10,598.17", "web/2/4,229.43"],
};
const BY_CHANNEL_TRAINING_5 = ["direct/21/14,185.64", "partner/22/16,321.12", "web/37/34,716.74"];
/** Rows of "orders by customer" (customer/quantity/amount) for customers like "customer-01", by min_qty. */
const BY_CUSTOMER_01 = {
  1: [
    "customer-016/12/1,990.69",
    "customer-016/11/1,839.35",
    "customer-016/12/1,834.70",
    "customer-010/12/1,675.09",
    "customer-011/10/1,527.14",
    "customer-011/10/1,244.70",
    "customer-017/7/1,238.94",
    "customer-016/12/1,167.93",
  ],
  9: [
    "customer-016/12/1,990.69",
    "customer-016/11/1,839.35",
    "customer-016/12/1,834.70",
    "customer-010/12/1,675.09",
    "customer-011/10/1,527.14",
    "customer-011/10/1,244.70",
    "customer-016/12/1,167.93",
    "customer-011/9/1,134.66",
  ],
  12: ["customer-016/12/1,990.69", "customer-016/12/1,834.70", "customer-010/12/1,675.09", "customer-016/12/1,167.93"],
};
const BY_CUSTOMER_02_MIN_12 = [
  "customer-025/12/1,281.54",
  "customer-021/12/1,143.16",
  "customer-027/12/1,080.36",
  "customer-021/12/920.26",
  "customer-023/12/337.41",
];

interface ParamsDashboard {
  id: number;
  channel: number;
  customer: number;
  divide: number;
}

test.describe("Dashboard parameters", () => {
  const created = new Created();
  let byChannel: SeededQuery;
  let byCustomer: SeededQuery;
  let divide: SeededQuery;

  test.beforeAll(async ({ api, seed }) => {
    byChannel = await seedQueries.byChannel(api, created, seed.dataSources.postgres);
    byCustomer = await seedQueries.byCustomer(api, created, seed.dataSources.postgres);
    divide = await seedQueries.divide(api, created, seed.dataSources.postgres);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  /**
   * The dashboard the first test builds through the UI, made through the API for the other tests:
   *   by channel   min_qty -> dashboard parameter, cat -> widget parameter
   *   by customer  min_qty -> the same dashboard parameter, cust -> static value "customer-01"
   *   divide       divisor -> dashboard parameter
   */
  async function makeDashboard(api: RedashApi): Promise<ParamsDashboard> {
    const dashboard = await createDashboardViaApi(api, created, "D Params");
    return {
      id: dashboard.id,
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
      customer: await addWidgetViaApi(
        api,
        dashboard.id,
        byCustomer.viz.table,
        { col: 6, row: 0, sizeX: 6, sizeY: 10 },
        {
          ...dashboardLevel("min_qty"),
          cust: { name: "cust", type: "static-value", mapTo: "cust", value: "customer-01", title: "" },
        }
      ),
      divide: await addWidgetViaApi(
        api,
        dashboard.id,
        divide.viz.result,
        { col: 0, row: 7, sizeX: 4, sizeY: 5 },
        dashboardLevel("divisor")
      ),
    };
  }

  /** The rows of the two tables as "a/b/c" and the counter's value (or the widget's error). */
  async function data(page: Page, dashboard: ParamsDashboard) {
    const rows = async (id: number) => (await widgetRows(widgetById(page, id))).map((row) => row.join("/"));
    const counter = widgetById(page, dashboard.divide);
    return {
      channel: await rows(dashboard.channel),
      customer: await rows(dashboard.customer),
      divide: (await widgetError(counter).count())
        ? await widgetError(counter).innerText()
        : await counterValue(counter).innerText(),
    };
  }

  test("the mapping editor of Add Widget makes dashboard, widget and static value parameters", async ({
    page,
    api,
  }) => {
    test.setTimeout(150_000);
    const dashboardId = await createDashboard(page, uniqueName("D Params built"));
    created.dashboards.push(dashboardId);

    // Widget 1: min_qty stays a new dashboard parameter (the default), cat becomes a widget parameter
    const channel = await addWidget(page, byChannel.name, undefined, async () => {
      expect(await mappingRows(page)).toEqual([
        "min_qty {{ min_qty }} 1 Dashboard min_qty",
        "cat {{ cat }} Hardware Dashboard cat",
      ]);
      await byTest(page, "EditParamMappingButton-cat").click();
      const popover = mappingPopover(page);
      await expect(popover.locator(".ant-radio-wrapper")).toHaveText([
        "New dashboard parameter",
        "Existing dashboard parameter",
        "Widget parameter",
        "Static value",
      ]);
      await expect(popover.locator(".ant-radio-wrapper-checked")).toHaveText("New dashboard parameter");
      // The dashboard has no parameters yet
      await expect(popover.locator(".ant-radio-wrapper-disabled")).toHaveText("Existing dashboard parameter");
      await byTest(popover, "WidgetParameterOption").click();
      await popover.locator("button.ant-btn-primary").click();
      await expect
        .poll(() => mappingRows(page))
        .toEqual(["min_qty {{ min_qty }} 1 Dashboard min_qty", "cat {{ cat }} Hardware Widget parameter"]);
    });

    // Widget 2: min_qty maps to the dashboard parameter that exists now, cust becomes a static value
    const customer = await addWidget(page, byCustomer.name, undefined, async () => {
      expect(await mappingRows(page)).toEqual([
        "min_qty {{ min_qty }} 1 Dashboard min_qty",
        "cust {{ cust }} a Dashboard cust",
      ]);
      await byTest(page, "EditParamMappingButton-cust").click();
      const popover = mappingPopover(page);
      await byTest(popover, "StaticValueOption").click();
      await popover.locator("input.ant-input").last().click();
      await retype(page, "customer-01");
      await popover.locator("button.ant-btn-primary").click();
      await expect
        .poll(() => mappingRows(page))
        .toEqual(["min_qty {{ min_qty }} 1 Dashboard min_qty", "cust {{ cust }} customer-01 Static value"]);
    });

    // Widget 3: divisor is a new dashboard parameter
    const counter = await addWidget(page, divide.name, VIZ.result);
    await settled(page);
    await doneEditing(page);

    // One min_qty for both widgets, no cust, and cat only inside its widget
    await expect
      .poll(() => shownParameters(dashboardParameters(page)))
      .toEqual([
        ["min_qty", "1"],
        ["divisor", "4"],
      ]);
    await expect(byTest(widgetById(page, channel), "ParameterName-cat")).toContainText("Hardware");
    await expect(widgetById(page, customer).locator('[data-test^="ParameterName-"]')).toHaveCount(0);
    await expect
      .poll(() => data(page, { id: dashboardId, channel, customer, divide: counter }))
      .toEqual({ channel: BY_CHANNEL[1], customer: BY_CUSTOMER_01[1], divide: "250" });
    const url = new URL(page.url());
    expect(Object.fromEntries(url.searchParams)).toEqual({
      p_divisor: "4",
      p_min_qty: "1",
      [`p_w${channel}_cat`]: "Hardware",
    });

    const widgets = (await getDashboard(api, dashboardId)).widgets;
    const mappings = (id: number) =>
      Object.fromEntries(
        Object.entries(widgets.find((w) => w.id === id)?.options.parameterMappings || {}).map(([name, mapping]) => [
          name,
          [mapping.type, mapping.mapTo, mapping.value],
        ])
      );
    expect(mappings(channel)).toEqual({
      min_qty: ["dashboard-level", "min_qty", null],
      cat: ["widget-level", "cat", null],
    });
    expect(mappings(customer)).toEqual({
      min_qty: ["dashboard-level", "min_qty", null],
      cust: ["static-value", "cust", "customer-01"],
    });
    expect(mappings(counter)).toEqual({ divisor: ["dashboard-level", "divisor", null] });
  });

  test("a changed dashboard parameter is applied to every widget that uses it", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const bar = dashboardParameters(page);
    const initial = { channel: BY_CHANNEL[1], customer: BY_CUSTOMER_01[1], divide: "250" };
    await expect.poll(() => data(page, dashboard)).toEqual(initial);

    await typeParameter(page, bar, "min_qty", 9);
    // Nothing changes until the change is applied; the button counts the changed parameters
    await expect(applyButton(bar)).toContainText("Apply Changes");
    await expect(applyButton(bar)).toHaveAttribute("data-show", "true");
    await expect(applyButton(bar).locator(".ant-badge-count")).toHaveAttribute("title", "1");
    expect(await data(page, dashboard)).toEqual(initial);

    await applyButton(bar).click();
    await settled(page);
    await expect
      .poll(() => data(page, dashboard))
      .toEqual({ channel: BY_CHANNEL[9], customer: BY_CUSTOMER_01[9], divide: "250" });
    await expect(page).toHaveURL(/[?&]p_min_qty=9(&|$)/);
    await expect(applyButton(bar)).toHaveAttribute("data-show", "false");
  });

  test("two changed parameters are applied together with Ctrl/Cmd+Enter", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const bar = dashboardParameters(page);
    await typeParameter(page, bar, "divisor", 8);
    await typeParameter(page, bar, "min_qty", 5);
    await expect(applyButton(bar).locator(".ant-badge-count")).toHaveAttribute("title", "2");

    await page.keyboard.press(`${MOD}+Enter`);
    await settled(page);
    await expect
      .poll(() => data(page, dashboard))
      .toEqual({ channel: BY_CHANNEL[5], customer: BY_CUSTOMER_01[1], divide: "125" });
    const params = new URL(page.url()).searchParams;
    expect([params.get("p_divisor"), params.get("p_min_qty")]).toEqual(["8", "5"]);
  });

  test("a widget-level parameter is applied to its widget only", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id, "?p_min_qty=5");
    const widget = widgetById(page, dashboard.channel);
    await expect.poll(() => data(page, dashboard)).toMatchObject({ channel: BY_CHANNEL[5] });
    const before = await data(page, dashboard);

    await pick(page, byTest(widget, "ParameterName-cat"), "Training");
    await applyButton(widget).click();
    await settled(page);
    await expect.poll(() => data(page, dashboard)).toEqual({ ...before, channel: BY_CHANNEL_TRAINING_5 });
    expect(new URL(page.url()).searchParams.get(`p_w${dashboard.channel}_cat`)).toBe("Training");

    // The value is in the URL, so a reload keeps it
    await page.reload();
    await settled(page);
    await expect(byTest(widget, "ParameterName-cat")).toContainText("Training");
    await expect.poll(() => data(page, dashboard)).toEqual({ ...before, channel: BY_CHANNEL_TRAINING_5 });
  });

  test("parameter values are taken from the URL and kept on reload", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id, "?p_min_qty=12&p_divisor=10");
    const check = async () => {
      await expect
        .poll(() => shownParameters(dashboardParameters(page)))
        .toEqual([
          ["min_qty", "12"],
          ["divisor", "10"],
        ]);
      await expect
        .poll(() => data(page, dashboard))
        .toEqual({ channel: BY_CHANNEL[12], customer: BY_CUSTOMER_01[12], divide: "100" });
    };
    await check();
    await page.reload();
    await settled(page);
    await check();
    const params = new URL(page.url()).searchParams;
    expect([params.get("p_divisor"), params.get("p_min_qty")]).toEqual(["10", "12"]);
  });

  test("Edit Parameters turns a static value into a dashboard parameter", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id, "?p_min_qty=12");
    const widget = widgetById(page, dashboard.customer);
    await expect.poll(() => data(page, dashboard)).toMatchObject({ customer: BY_CUSTOMER_01[12] });

    const menu = await openWidgetMenu(page, widget);
    await expect(menu.locator(".ant-dropdown-menu-item")).toHaveText([
      "Download as CSV File",
      "Download as TSV File",
      "Download as Excel File",
      "View Query",
      "Edit Parameters",
      "Remove from Dashboard",
    ]);
    await menu.getByText("Edit Parameters").click();
    const dialog = page.locator(".ant-modal").filter({ has: page.locator(".parameters-mapping-list") });
    await expect
      .poll(() => mappingRows(page))
      .toEqual(["cust {{ cust }} customer-01 Static value", "min_qty {{ min_qty }} 12 Dashboard min_qty"]);
    await byTest(page, "EditParamMappingButton-cust").click();
    const popover = mappingPopover(page);
    await expect(popover.locator(".ant-radio-wrapper-checked")).toHaveText("Static value");
    await byTest(popover, "NewDashboardParameterOption").click();
    await popover.locator("button.ant-btn-primary").click();
    await expect
      .poll(() => mappingRows(page))
      .toEqual(["cust {{ cust }} customer-01 Dashboard cust", "min_qty {{ min_qty }} 12 Dashboard min_qty"]);
    await dialog.locator(".ant-modal-footer button.ant-btn-primary").click();
    await expect(dialog).toBeHidden();
    await settled(page);

    // The static value is the new dashboard parameter's value, so the data stays the same
    await expect
      .poll(() => shownParameters(dashboardParameters(page)))
      .toEqual([
        ["min_qty", "12"],
        ["cust", "customer-01"],
        ["divisor", "4"],
      ]);
    await expect.poll(() => data(page, dashboard)).toMatchObject({ customer: BY_CUSTOMER_01[12] });
    const mapping = (await getDashboard(api, dashboard.id)).widgets.find((w) => w.id === dashboard.customer)?.options
      .parameterMappings.cust;
    expect(mapping).toMatchObject({ type: "dashboard-level", mapTo: "cust" });

    await applyDashboardParameter(page, "cust", "customer-02");
    await expect.poll(() => data(page, dashboard)).toMatchObject({ customer: BY_CUSTOMER_02_MIN_12 });
    expect(new URL(page.url()).searchParams.get("p_cust")).toBe("customer-02");
  });

  test("dashboard parameters are reordered by dragging and the order is saved", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const bar = dashboardParameters(page);
    const order = async () => (await shownParameters(bar)).map(([name]) => name);
    expect(await order()).toEqual(["min_qty", "divisor"]);
    await enterEditMode(page);

    const handle = await centerOf(byTest(bar, "DragHandle-divisor"));
    const target = await byTest(bar, "ParameterBlock-min_qty").boundingBox();
    if (!target) {
      throw new Error("the min_qty parameter is not visible");
    }
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    for (let step = 1; step <= 15; step += 1) {
      await page.mouse.move(handle.x + ((target.x + 8 - handle.x) * step) / 15, handle.y + (step % 2));
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
    await page.mouse.up();
    await expect.poll(order).toEqual(["divisor", "min_qty"]);

    // The new order is saved by the page on its own; "Saved" in the header is still the previous state until then
    await expect
      .poll(async () => (await getDashboard(api, dashboard.id)).options.globalParamOrder)
      .toEqual(["divisor", "min_qty"]);
    await doneEditing(page);
    await page.reload();
    await settled(page);
    await expect.poll(order).toEqual(["divisor", "min_qty"]);
  });

  test("a widget whose query fails shows the error, the others keep working, and it recovers", async ({
    page,
    api,
  }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const working = { channel: BY_CHANNEL[1], customer: BY_CUSTOMER_01[1] };
    await expect.poll(() => data(page, dashboard)).toEqual({ ...working, divide: "250" });

    await applyDashboardParameter(page, "divisor", 0);
    const failed = { ...working, divide: "Error running query: division by zero" };
    await expect.poll(() => data(page, dashboard)).toEqual(failed);

    // Refreshing the dashboard gives the same picture
    await refreshButton(page).click();
    await settled(page);
    await expect.poll(() => data(page, dashboard)).toEqual(failed);

    await applyDashboardParameter(page, "divisor", 4);
    await expect.poll(() => data(page, dashboard)).toEqual({ ...working, divide: "250" });
  });
});
