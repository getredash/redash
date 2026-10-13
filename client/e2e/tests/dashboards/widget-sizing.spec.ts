import { expect, type RedashApi, test } from "../../support/fixtures";
import { byTest, centerOf, createQueryViaApi, drag } from "../../support/ui";
import {
  addWidgetWithDefaultsViaApi,
  applyButton,
  boxes,
  Created,
  createDashboardViaApi,
  enterEditMode,
  openDashboard,
  settled,
  stableBoxes,
  typeParameter,
  widgetById,
} from "./helpers";

/** Height of a widget that is `rows` grid rows high: 50 px per row, minus the 15 px margin below it. */
const heightOf = (rows: number) => rows * 50 - 15;

test.describe("Widget sizing and refreshing", () => {
  const created = new Created();
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  /** A dashboard with one widget showing the table of a new query, and the ids to find them. */
  async function tableWidget(
    api: RedashApi,
    seed: { sql: string; parameters?: Record<string, unknown>[] },
    position: { sizeX: number; sizeY: number; autoHeight?: boolean }
  ) {
    const dataSourceId = (await api.get("/api/data_sources")).find((d: { name: string }) => d.name === "E2E PostgreSQL")
      .id as number;
    const query = await createQueryViaApi(api, {
      name: `D widget sizing ${Date.now()}`,
      dataSourceId,
      sql: seed.sql,
      options: { parameters: seed.parameters || [] },
    });
    created.queries.push(query.id);
    const saved = await api.get(`/api/queries/${query.id}`);
    const dashboard = await createDashboardViaApi(api, created, "D Widget sizing");
    const widgetId = await addWidgetWithDefaultsViaApi(
      api,
      dashboard.id,
      saved.visualizations.find((v: { type: string }) => v.type === "TABLE").id,
      { col: 0, row: 0, ...position }
    );
    return { dashboardId: dashboard.id, widgetId };
  }

  test.describe("Auto height for table visualization", () => {
    // Both numbers are grid rows: the widget is 50 px per row minus the 15 px margin. The header of the widget, the
    // table header, one row of the table per record and the space around them add up to 5 rows for 2 records and
    // 7 rows for 5 records, i.e. 100 px (two grid rows) for the 3 extra records.
    for (const [records, gridRows] of [
      [2, 5],
      [5, 7],
    ]) {
      test(`a widget with ${records} table rows is ${gridRows} grid rows high`, async ({ page, api }) => {
        const { dashboardId, widgetId } = await tableWidget(
          api,
          { sql: `select s.a from generate_series(1, ${records}) as s(a)` },
          { sizeX: 3, sizeY: 3 }
        );
        await openDashboard(page, dashboardId);
        await expect(widgetById(page, widgetId)).toHaveClass(/widget-auto-height-enabled/);
        await expect(widgetById(page, widgetId).locator("tbody tr.ant-table-row")).toHaveCount(records);
        await expect.poll(async () => (await boxes(page))[widgetId].h).toBe(heightOf(gridRows));
      });
    }

    test("auto height is revoked by adjusting the height manually", async ({ page, api }) => {
      const { dashboardId, widgetId } = await tableWidget(
        api,
        {
          sql: "select s.a from generate_series(1, {{ count }}) as s(a)",
          parameters: [{ name: "count", title: "count", type: "text", value: "3" }],
        },
        { sizeX: 3, sizeY: 3 }
      );
      await openDashboard(page, dashboardId);
      const widget = widgetById(page, widgetId);
      await expect(widget).toHaveClass(/widget-auto-height-enabled/);
      await enterEditMode(page);

      const setRows = async (count: number) => {
        await typeParameter(page, widget, "count", count);
        await applyButton(widget).click();
        await expect(widget.locator("tbody tr.ant-table-row")).toHaveCount(count);
        await settled(page);
      };

      // One record: 6 grid rows
      await setRows(1);
      await expect.poll(async () => (await boxes(page))[widgetId].h).toBe(heightOf(6));

      // One grid row taller by hand: the widget stops following its content
      const handle = widget.locator(".react-resizable-handle");
      await handle.scrollIntoViewIfNeeded();
      const from = await centerOf(handle);
      await drag(page, from, { x: from.x, y: from.y + 50 });
      expect((await stableBoxes(page))[widgetId].h).toBe(heightOf(7));
      await expect(widget).not.toHaveClass(/widget-auto-height-enabled/);

      // Five records would need 10 grid rows (what auto height gives: see the test above and "grows when ..." in
      // layout.spec.ts); the widget stays where the person put it
      await setRows(5);
      expect((await stableBoxes(page))[widgetId].h).toBe(heightOf(7));
    });
  });
  test.describe("Fixed height", () => {
    const FIXED = { sizeX: 3, sizeY: 10, autoHeight: false };

    test("the table of a fixed height widget fills the widget instead of overflowing", async ({ page, api }) => {
      const { dashboardId, widgetId } = await tableWidget(
        api,
        { sql: `select '${"loremipsum".repeat(15)}' as text from generate_series(1, 15)` },
        FIXED
      );
      await openDashboard(page, dashboardId);
      const widget = widgetById(page, widgetId);
      await expect(byTest(widget, "TableVisualization")).toBeVisible();
      const sizes = await widget.evaluate((element) => {
        const rect = (selector: string) => element.querySelector(selector)?.getBoundingClientRect();
        const table = rect('[data-test="TableVisualization"]');
        const header = rect(".body-row");
        const widgetRect = element.getBoundingClientRect();
        return {
          widgetHeight: widgetRect.height,
          widgetBottom: widgetRect.bottom,
          headerHeight: header?.height ?? 0,
          tableHeight: table?.height ?? 0,
          tableBottom: table?.bottom ?? 0,
        };
      });
      expect(sizes.widgetHeight).toBe(heightOf(10));
      // The table ends inside the widget (it does not spill over its bottom edge) ...
      expect(sizes.tableBottom).toBeLessThanOrEqual(sizes.widgetBottom);
      // ... and takes all the room under the widget's header. Measured: the header is 56 px high and 48 px under the
      // table stay free for the pager, so a 485 px widget has a 381 px table (the Cypress suite expected 380 or 381)
      expect(Math.abs(sizes.tableHeight - (sizes.widgetHeight - sizes.headerHeight - 48))).toBeLessThanOrEqual(1);
    });

    test("the pager of a table with many rows stays visible at the bottom of a fixed height widget", async ({
      page,
      api,
    }) => {
      const { dashboardId, widgetId } = await tableWidget(
        api,
        { sql: "select 'lorem ipsum' as text from generate_series(1, 50)" },
        FIXED
      );
      await openDashboard(page, dashboardId);
      const widget = widgetById(page, widgetId);
      const pager = widget.locator(".ant-pagination-mini");
      await expect(pager).toBeVisible();
      // It is under the table, and inside the widget
      const [pagerBox, tableBox, widgetBox] = await Promise.all([
        pager.boundingBox(),
        byTest(widget, "TableVisualization").boundingBox(),
        widget.boundingBox(),
      ]);
      expect(pagerBox && tableBox && widgetBox).toBeTruthy();
      expect(pagerBox?.y).toBeGreaterThanOrEqual((tableBox?.y ?? 0) + (tableBox?.height ?? 0) - 1);
      expect((pagerBox?.y ?? 0) + (pagerBox?.height ?? 0)).toBeLessThanOrEqual(
        (widgetBox?.y ?? 0) + (widgetBox?.height ?? 0)
      );
      // The table is cut off by the page size, not by the widget: the pager leads to the rest
      expect(await widget.locator("tbody tr.ant-table-row").count()).toBeLessThan(50);
    });
  });
  test("the old rows stay on screen while a widget refreshes with a slow query", async ({ page, api }) => {
    const { dashboardId, widgetId } = await tableWidget(
      api,
      {
        sql: "select pg_sleep({{ sleep_time }}), 'sleep time: {{ sleep_time }}' as sleeptime",
        parameters: [{ name: "sleep_time", title: "Sleep time", type: "number", value: 0 }],
      },
      { sizeX: 6, sizeY: 4 }
    );
    await openDashboard(page, dashboardId);
    const widget = widgetById(page, widgetId);
    const table = byTest(widget, "TableVisualization");
    const indicator = widget.locator(".refresh-indicator");
    await expect(table).toContainText("sleep time: 0");
    await expect(indicator).toBeHidden();

    await typeParameter(page, widget, "sleep_time", 6);
    await applyButton(widget).click();
    await expect(indicator).toBeVisible();
    await expect(table).toContainText("sleep time: 0");
    // ... until the new result arrives
    await expect(table).toContainText("sleep time: 6", { timeout: 30_000 });
    await expect(indicator).toBeHidden();
  });
});
