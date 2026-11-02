import type { Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { centerOf, drag } from "../../support/ui";
import {
  addTextboxWithDefaultLimitsViaApi,
  boxes,
  Created,
  createDashboardViaApi,
  enterEditMode,
  openDashboard,
  savedPositions,
  stableBoxes,
  widgetById,
} from "./helpers";

/**
 * The viewport of the Cypress suite: 1215 px of grid plus the 80 px side menu. That makes a column 85 px wide and a
 * grid step (column + 15 px margin) 100 px; a grid row is 50 px.
 */
const VIEWPORT = { width: 1295, height: 800 };
const COLUMN_STEP = 100;
const ROW_STEP = 50;

test.describe("Grid compliant widgets", () => {
  test.use({ viewport: VIEWPORT });

  const created = new Created();
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  /** A dashboard in edit mode with one text box, 3 columns wide and 3 rows high, in the top left corner. */
  async function editableTextbox(page: Page, api: Parameters<typeof createDashboardViaApi>[0]) {
    const dashboard = await createDashboardViaApi(api, created, "D Grid snap");
    const id = await addTextboxWithDefaultLimitsViaApi(api, dashboard.id, "Hello World!", {
      col: 0,
      row: 0,
      sizeX: 3,
      sizeY: 3,
    });
    await openDashboard(page, dashboard.id);
    await enterEditMode(page);
    const box = (await stableBoxes(page))[id];
    // 3 columns of 85 px and two margins; 3 rows of 50 px without a margin
    expect(box).toEqual({ x: 15, y: 15, w: 285, h: 135 });
    return { dashboardId: dashboard.id, id, box };
  }

  /** The point to grab to move a widget: its middle. */
  const dragPoint = (page: Page, id: number) => centerOf(widgetById(page, id));
  const resizeHandle = async (page: Page, id: number) => {
    const handle = widgetById(page, id).locator(".react-resizable-handle");
    await handle.scrollIntoViewIfNeeded();
    return centerOf(handle);
  };

  async function dragBy(page: Page, id: number, dx: number, dy = 0) {
    const from = await dragPoint(page, id);
    await drag(page, from, { x: from.x + dx, y: from.y + dy });
  }

  async function resizeBy(page: Page, id: number, dx: number, dy = 0) {
    const from = await resizeHandle(page, id);
    await drag(page, from, { x: from.x + dx, y: from.y + dy });
  }

  test.describe("Draggable", () => {
    test("a widget dragged less than half a column stays put", async ({ page, api }) => {
      const { id, box } = await editableTextbox(page, api);
      await dragBy(page, id, 30);
      expect((await stableBoxes(page))[id]).toEqual(box);
    });

    test("a widget dragged by more than half a column moves one column", async ({ page, api }) => {
      const { id, box } = await editableTextbox(page, api);
      await dragBy(page, id, 110);
      expect((await stableBoxes(page))[id]).toEqual({ ...box, x: box.x + COLUMN_STEP });
    });

    test("a widget dragged by two columns moves two columns", async ({ page, api }) => {
      const { id, box } = await editableTextbox(page, api);
      await dragBy(page, id, 200);
      expect((await stableBoxes(page))[id]).toEqual({ ...box, x: box.x + 2 * COLUMN_STEP });
    });

    test("a dragged widget is saved without pressing Done Editing", async ({ page, api }) => {
      const { id, dashboardId } = await editableTextbox(page, api);
      const saved = page.waitForResponse(
        (r) => new RegExp(`/api/widgets/${id}$`).test(r.url()) && r.request().method() === "POST"
      );
      await dragBy(page, id, 100);
      expect((await saved).ok()).toBe(true);
      await expect
        .poll(async () => (await savedPositions(api, dashboardId))[id])
        .toEqual({ col: 1, row: 0, sizeX: 3, sizeY: 3 });
    });
  });

  test.describe("Resizeable", () => {
    test.describe("Column snap", () => {
      test("a widget resized by less than half a column keeps its width", async ({ page, api }) => {
        const { id, box } = await editableTextbox(page, api);
        await resizeBy(page, id, 30);
        expect((await stableBoxes(page))[id]).toEqual(box);
      });

      test("a widget resized by more than half a column grows by one column", async ({ page, api }) => {
        const { id, box } = await editableTextbox(page, api);
        await resizeBy(page, id, 110);
        expect((await stableBoxes(page))[id]).toEqual({ ...box, w: box.w + COLUMN_STEP });
      });

      test("a widget resized by four columns grows by four columns", async ({ page, api }) => {
        const { id, box } = await editableTextbox(page, api);
        await resizeBy(page, id, 400);
        expect((await stableBoxes(page))[id]).toEqual({ ...box, w: box.w + 4 * COLUMN_STEP });
      });
    });

    test.describe("Row snap", () => {
      test("a widget resized by less than half a row keeps its height", async ({ page, api }) => {
        const { id, box } = await editableTextbox(page, api);
        await resizeBy(page, id, 0, 10);
        expect((await stableBoxes(page))[id]).toEqual(box);
      });

      test("a widget resized by more than half a row grows by one row", async ({ page, api }) => {
        const { id, box } = await editableTextbox(page, api);
        await resizeBy(page, id, 0, 30);
        expect((await stableBoxes(page))[id]).toEqual({ ...box, h: box.h + ROW_STEP });
      });

      test("a widget cannot be resized below its minimum size", async ({ page, api }) => {
        const { id, box } = await editableTextbox(page, api);
        await resizeBy(page, id, -box.w, -box.h);
        // The minimum of a text box is 2 columns (85 + 15 + 85) by 2 rows (2 * 50 - 15)
        expect((await stableBoxes(page))[id]).toEqual({ ...box, w: 185, h: 85 });
      });
    });

    test("a resized widget is saved without pressing Done Editing", async ({ page, api }) => {
      const { id, dashboardId } = await editableTextbox(page, api);
      const saved = page.waitForResponse(
        (r) => new RegExp(`/api/widgets/${id}$`).test(r.url()) && r.request().method() === "POST"
      );
      await resizeBy(page, id, 200);
      expect((await saved).ok()).toBe(true);
      await expect
        .poll(async () => (await savedPositions(api, dashboardId))[id])
        .toEqual({ col: 0, row: 0, sizeX: 5, sizeY: 3 });
      expect((await boxes(page))[id].w).toBe(485);
    });
  });
});
