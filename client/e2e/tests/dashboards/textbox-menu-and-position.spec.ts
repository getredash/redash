import type { Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { byTest } from "../../support/ui";
import {
  addTextboxViaApi,
  Created,
  confirmButton,
  createDashboardViaApi,
  doneEditing,
  enterEditMode,
  expectBoxClose,
  expectedBox,
  getDashboard,
  grid,
  openDashboard,
  openWidgetMenu,
  stableBoxes,
  widgetById,
} from "./helpers";

test.describe("Dashboard text boxes: removal and position", () => {
  const created = new Created();
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  test("two text boxes are removed one after the other in edit mode", async ({ page, api }) => {
    // Regression test for https://github.com/getredash/redash/issues/3202: the delete button of the second text box
    // used to be unclickable after the first one was removed
    const dashboard = await createDashboardViaApi(api, created, "D Textbox remove twice");
    const first = await addTextboxViaApi(api, dashboard.id, "txb 1", { col: 0, row: 0, sizeX: 3, sizeY: 3 });
    const second = await addTextboxViaApi(api, dashboard.id, "txb 2", { col: 3, row: 0, sizeX: 3, sizeY: 3 });
    await openDashboard(page, dashboard.id);
    await enterEditMode(page);

    await byTest(widgetById(page, first), "WidgetDeleteButton").click();
    await confirmButton(page).click();
    await expect(widgetById(page, first)).toHaveCount(0);
    await expect(widgetById(page, second)).toBeVisible();

    await byTest(widgetById(page, second), "WidgetDeleteButton").click();
    await confirmButton(page).click();
    await expect(widgetById(page, second)).toHaveCount(0);

    await doneEditing(page);
    expect((await getDashboard(api, dashboard.id)).widgets).toEqual([]);
  });

  test("a text box is removed with Remove from Dashboard in its menu, outside edit mode", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Textbox remove by menu");
    const id = await addTextboxViaApi(api, dashboard.id, "Hello World!", { col: 0, row: 0, sizeX: 3, sizeY: 3 });
    await openDashboard(page, dashboard.id);
    await expect(page.locator(".dashboard-wrapper.preview-mode")).toBeVisible();

    const menu = await openWidgetMenu(page, widgetById(page, id));
    await menu.getByText("Remove from Dashboard").click();
    await confirmButton(page).click();
    await expect(widgetById(page, id)).toHaveCount(0);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).widgets).toEqual([]);

    await page.reload();
    await expect(page.locator(".dashboard-wrapper")).toBeAttached();
    await expect(widgetById(page, id)).toHaveCount(0);
  });

  /** Two text boxes saved with these positions, drawn in a 1215 px grid; each must be where its position puts it. */
  async function expectDrawnAtPositions(
    page: Page,
    api: RedashApi,
    positions: { col: number; row: number; sizeX: number; sizeY: number }[],
    drawn = positions
  ) {
    const dashboard = await createDashboardViaApi(api, created, "D Textbox positions");
    const ids = [] as number[];
    for (const [index, position] of positions.entries()) {
      ids.push(await addTextboxViaApi(api, dashboard.id, `x${index}`, position));
    }
    await page.setViewportSize({ width: 1295, height: 800 });
    await openDashboard(page, dashboard.id);

    const all = await stableBoxes(page);
    const gridWidth = (await grid(page).boundingBox())?.width || 0;
    for (const [index, position] of drawn.entries()) {
      expectBoxClose(all[ids[index]], expectedBox(position, gridWidth));
    }
  }

  test("text boxes are drawn where their saved positions put them", async ({ page, api }) => {
    await expectDrawnAtPositions(page, api, [
      { col: 0, row: 0, sizeX: 3, sizeY: 2 },
      { col: 1, row: 2, sizeX: 3, sizeY: 4 },
    ]);
  });

  // The second box starts in the last row of the first one: the grid never draws widgets on top of each other
  test("a text box saved over another one is drawn below it", async ({ page, api }) => {
    await expectDrawnAtPositions(
      page,
      api,
      [
        { col: 0, row: 0, sizeX: 3, sizeY: 2 },
        { col: 1, row: 1, sizeX: 3, sizeY: 4 },
      ],
      [
        { col: 0, row: 0, sizeX: 3, sizeY: 2 },
        { col: 1, row: 2, sizeX: 3, sizeY: 4 },
      ]
    );
  });
});
