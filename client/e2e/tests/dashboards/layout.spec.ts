import type { Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { byTest, centerOf, drag } from "../../support/ui";
import {
  addTextboxViaApi,
  addWidgetViaApi,
  applyDashboardParameter,
  boxes,
  Created,
  columnStep,
  createDashboardViaApi,
  dashboardLevel,
  doneEditing,
  enterEditMode,
  expectBoxClose,
  expectedBox,
  getDashboard,
  grid,
  openDashboard,
  overlaps,
  type Position,
  type SeededQuery,
  savedPositions,
  seedQueries,
  settled,
  stableBoxes,
  widgetById,
} from "./helpers";

interface Layout {
  id: number;
  bar: number;
  pie: number;
  counter: number;
  table: number;
  text: number;
}

test.describe("Dashboard layout", () => {
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

  /**
   * bar  bar  bar | pie  pie  pie       rows 0-7
   * counter  | table (auto height)      rows 8-19 (the last two columns stay free unless `positions` says otherwise)
   * text                                rows 20-24
   */
  async function makeDashboard(api: RedashApi, positions: Partial<Record<keyof Layout, Position>> = {}) {
    const dashboard = await createDashboardViaApi(api, created, "D Layout");
    const at = (key: keyof Layout, position: Position) => positions[key] || position;
    const layout: Layout = {
      id: dashboard.id,
      bar: await addWidgetViaApi(
        api,
        dashboard.id,
        byCategory.viz.bar,
        at("bar", { col: 0, row: 0, sizeX: 6, sizeY: 8 })
      ),
      pie: await addWidgetViaApi(
        api,
        dashboard.id,
        byCategory.viz.pie,
        at("pie", { col: 6, row: 0, sizeX: 6, sizeY: 8 })
      ),
      counter: await addWidgetViaApi(
        api,
        dashboard.id,
        byCategory.viz.counter,
        at("counter", { col: 0, row: 8, sizeX: 4, sizeY: 5 })
      ),
      table: await addWidgetViaApi(
        api,
        dashboard.id,
        tableRows.viz.table,
        at("table", { col: 4, row: 8, sizeX: 6, sizeY: 12, autoHeight: true }),
        dashboardLevel("rows")
      ),
      text: await addTextboxViaApi(
        api,
        dashboard.id,
        "## D layout text",
        at("text", { col: 0, row: 20, sizeX: 6, sizeY: 5 })
      ),
    };
    return layout;
  }

  /** The center of a widget's resize handle, scrolled into view. */
  async function resizeHandle(page: Page, widgetId: number) {
    const handle = widgetById(page, widgetId).locator(".react-resizable-handle");
    await handle.scrollIntoViewIfNeeded();
    return centerOf(handle);
  }

  /** A point on the header of a widget, by which it can be dragged. */
  async function dragPoint(page: Page, widgetId: number) {
    await widgetById(page, widgetId).scrollIntoViewIfNeeded();
    const box = await widgetById(page, widgetId).boundingBox();
    if (!box) {
      throw new Error("widget is not visible");
    }
    return { x: box.x + 150, y: box.y + 20 };
  }

  /**
   * Leaves edit mode and checks that what was on the screen while editing is what was saved: same boxes after
   * "Done Editing" and after a reload, every box where its saved position puts it, and no overlaps.
   */
  async function expectLayoutSaved(page: Page, api: RedashApi, dashboardId: number) {
    const editing = await stableBoxes(page);
    expect(overlaps(editing)).toEqual([]);
    await doneEditing(page);
    await settled(page);
    expect(await stableBoxes(page)).toEqual(editing);

    await page.reload();
    await settled(page);
    const reloaded = await stableBoxes(page);
    expect(reloaded).toEqual(editing);
    expect(overlaps(reloaded)).toEqual([]);

    const gridWidth = (await grid(page).boundingBox())?.width || 0;
    const dashboard = await getDashboard(api, dashboardId);
    for (const widget of dashboard.widgets) {
      expectBoxClose(reloaded[widget.id], expectedBox(widget.options.position, gridWidth));
    }
    return savedPositions(api, dashboardId);
  }

  test("a table widget is resized narrower with its corner handle", async ({ page, api }) => {
    const layout = await makeDashboard(api);
    await openDashboard(page, layout.id);
    await enterEditMode(page);
    const before = (await stableBoxes(page))[layout.table];
    const step = await columnStep(page);

    const handle = await resizeHandle(page, layout.table);
    await drag(page, handle, { x: handle.x - 2 * step, y: handle.y });
    const after = (await stableBoxes(page))[layout.table];
    // 6 columns -> 4 columns; the left edge, the top and the height stay
    expect(after).toMatchObject({ x: before.x, y: before.y, h: before.h });
    expect(Math.abs(after.w - (before.w - 2 * step))).toBeLessThanOrEqual(2);

    const saved = await expectLayoutSaved(page, api, layout.id);
    expect(saved[layout.table]).toMatchObject({ col: 4, row: 8, sizeX: 4 });
    // Nothing else moved
    expect(saved[layout.bar]).toEqual({ col: 0, row: 0, sizeX: 6, sizeY: 8 });
    expect(saved[layout.counter]).toEqual({ col: 0, row: 8, sizeX: 4, sizeY: 5 });
  });

  test("a widget is dragged into free space", async ({ page, api }) => {
    // The table is 4 columns wide here, so columns 8-11 next to it are free
    const layout = await makeDashboard(api, { table: { col: 4, row: 8, sizeX: 4, sizeY: 12, autoHeight: true } });
    await openDashboard(page, layout.id);
    await enterEditMode(page);
    const before = await stableBoxes(page);
    const step = await columnStep(page);

    const from = await dragPoint(page, layout.counter);
    await drag(page, from, { x: from.x + 8 * step, y: from.y + 4 }, { steps: 15 });
    const after = await stableBoxes(page);
    expect(Math.abs(after[layout.counter].x - (before[layout.counter].x + 8 * step))).toBeLessThanOrEqual(2);
    expect(after[layout.counter]).toMatchObject({ y: before[layout.counter].y, h: before[layout.counter].h });
    expect(after[layout.table]).toEqual(before[layout.table]);

    const saved = await expectLayoutSaved(page, api, layout.id);
    expect(saved[layout.counter]).toEqual({ col: 8, row: 8, sizeX: 4, sizeY: 5 });
    expect(saved[layout.table]).toMatchObject({ col: 4, row: 8, sizeX: 4 });
  });

  test("a chart widget is resized narrower and taller, and the chart re-fits", async ({ page, api }) => {
    const layout = await makeDashboard(api);
    await openDashboard(page, layout.id);
    const plotWidth = async () =>
      Math.round((await widgetById(page, layout.bar).locator(".main-svg").first().boundingBox())?.width || 0);
    const before = (await stableBoxes(page))[layout.bar];
    expect(await plotWidth()).toBe(before.w);
    await enterEditMode(page);
    const step = await columnStep(page);

    const handle = await resizeHandle(page, layout.bar);
    await drag(page, handle, { x: handle.x - 2 * step, y: handle.y + 100 }, { steps: 14 });
    const after = (await stableBoxes(page))[layout.bar];
    expect(after).toMatchObject({ x: before.x, y: before.y, h: before.h + 100 });
    expect(Math.abs(after.w - (before.w - 2 * step))).toBeLessThanOrEqual(2);
    await expect.poll(plotWidth).toBe(after.w);

    const saved = await expectLayoutSaved(page, api, layout.id);
    expect(saved[layout.bar]).toEqual({ col: 0, row: 0, sizeX: 4, sizeY: 10 });
    await expect.poll(plotWidth).toBe(after.w);
  });

  test("a widget is dragged sideways next to its neighbour", async ({ page, api }) => {
    const layout = await makeDashboard(api, { bar: { col: 0, row: 0, sizeX: 4, sizeY: 8 } });
    await openDashboard(page, layout.id);
    await enterEditMode(page);
    const before = await stableBoxes(page);
    const step = await columnStep(page);

    const from = await dragPoint(page, layout.pie);
    await drag(page, from, { x: from.x - 2 * step, y: from.y + 4 });
    const after = await stableBoxes(page);
    expect(Math.abs(after[layout.pie].x - (before[layout.pie].x - 2 * step))).toBeLessThanOrEqual(2);
    expect(after[layout.pie]).toMatchObject({ y: before[layout.pie].y, h: before[layout.pie].h });
    // Column widths are rounded, so the width may differ by a pixel in another column
    expect(Math.abs(after[layout.pie].w - before[layout.pie].w)).toBeLessThanOrEqual(1);

    const saved = await expectLayoutSaved(page, api, layout.id);
    expect(saved[layout.pie]).toEqual({ col: 4, row: 0, sizeX: 6, sizeY: 8 });
    expect(saved[layout.bar]).toEqual({ col: 0, row: 0, sizeX: 4, sizeY: 8 });
  });

  test("a table widget with auto height grows and shrinks with its rows", async ({ page, api }) => {
    const layout = await makeDashboard(api);
    await openDashboard(page, layout.id);
    const table = widgetById(page, layout.table);
    await expect(table).toHaveClass(/widget-auto-height-enabled/);

    // 50 px per grid row minus the 15 px margin: 6, 18 and 12 grid rows
    for (const [rows, height] of [
      [3, 285],
      [20, 885],
      [12, 585],
    ]) {
      await applyDashboardParameter(page, "rows", rows);
      await expect(table.locator("tbody tr.ant-table-row")).toHaveCount(rows);
      await expect
        .poll(async () => (await boxes(page))[layout.table].h, { message: `height with ${rows} rows` })
        .toBe(height);
      const all = await stableBoxes(page);
      expect(overlaps(all)).toEqual([]);
      // The whole table shows, without a scrollbar inside the widget
      const [scrollHeight, clientHeight] = await table
        .locator(".scrollbox")
        .evaluate((element) => [element.scrollHeight, element.clientHeight]);
      expect(scrollHeight).toBe(clientHeight);
    }
    await expect(page).toHaveURL(/[?&]p_rows=12/);
  });

  test.describe("in a narrow window", () => {
    const WIDE = { width: 1440, height: 900 };
    const NARROW = { width: 700, height: 900 };

    /** Waits for the single column layout: every widget at the left edge and as wide as the grid allows. */
    async function singleColumn(page: Page) {
      await expect
        .poll(async () => {
          const all = Object.values(await boxes(page));
          return [[...new Set(all.map((box) => box.x))], [...new Set(all.map((box) => box.w))]];
        })
        .toEqual([[15], [670]]);
      return stableBoxes(page);
    }

    test("the widgets form a single column without horizontal overflow, and widening restores the layout", async ({
      page,
      api,
    }) => {
      const layout = await makeDashboard(api);
      await openDashboard(page, layout.id);
      const wide = await stableBoxes(page);
      const positions = await savedPositions(api, layout.id);

      await page.setViewportSize(NARROW);
      const narrow = await singleColumn(page);
      expect(Object.keys(narrow)).toHaveLength(5);
      expect(overlaps(narrow)).toEqual([]);
      // Top to bottom in reading order of the wide layout: by row, then by column
      const order = Object.keys(narrow).sort((a, b) => narrow[a].y - narrow[b].y);
      expect(order).toEqual([layout.bar, layout.pie, layout.counter, layout.table, layout.text].map(String));
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      // Charts are re-fitted to the column
      await expect
        .poll(async () =>
          Math.round((await widgetById(page, layout.bar).locator(".main-svg").first().boundingBox())?.width || 0)
        )
        .toBe(670);

      await page.setViewportSize(WIDE);
      await expect.poll(() => boxes(page)).toEqual(wide);
      expect(await savedPositions(api, layout.id)).toEqual(positions);
    });

    test("a dashboard loaded in a narrow window gets its saved layout when widened, and editing does not rewrite it", async ({
      page,
      api,
    }) => {
      const layout = await makeDashboard(api);
      await openDashboard(page, layout.id);
      const wide = await stableBoxes(page);
      const positions = await savedPositions(api, layout.id);

      await page.setViewportSize(NARROW);
      await page.reload();
      await settled(page);
      expect(overlaps(await singleColumn(page))).toEqual([]);

      await page.setViewportSize(WIDE);
      await expect.poll(() => boxes(page)).toEqual(wide);

      await enterEditMode(page);
      await doneEditing(page);
      await settled(page);
      expect(await stableBoxes(page)).toEqual(wide);
      expect(await savedPositions(api, layout.id)).toEqual(positions);

      await page.reload();
      await settled(page);
      expect(await stableBoxes(page)).toEqual(wide);
    });

    test("editing the layout is not offered", async ({ page, api }) => {
      const layout = await makeDashboard(api);
      await openDashboard(page, layout.id);
      await page.setViewportSize(NARROW);
      await singleColumn(page);

      await byTest(page, "DashboardMoreButton").click();
      const menu = byTest(page, "DashboardMoreButtonMenu");
      await expect(menu.getByText("Archive")).toBeVisible();
      await expect(menu.getByText("Fork")).toBeVisible();
      await expect(menu.getByText("Edit", { exact: true })).toBeHidden();
      await page.keyboard.press("Escape");

      // Back in a wide window it is offered again
      await page.setViewportSize(WIDE);
      await expect.poll(async () => Object.values(await boxes(page)).some((box) => box.x > 15)).toBe(true);
      await byTest(page, "DashboardMoreButton").click();
      await expect(menu.getByText("Edit", { exact: true })).toBeVisible();
    });
  });
});
