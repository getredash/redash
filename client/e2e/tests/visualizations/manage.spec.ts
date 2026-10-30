import type { Page } from "@playwright/test";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, createVisualizationViaApi, dismissToasts, toast } from "../../support/ui";
import {
  activePane,
  clickVisualizationTab,
  dialog,
  editor,
  editVisualization,
  nameVisualization,
  openSourcePage,
  openViewPage,
  SLOW_INSTANCE_TIMEOUT,
  savedVisualization,
  savedVisualizations,
  saveVisualization,
  seedQuery,
  stubMapTiles,
  tabs,
  typeIn,
  visualizationTab,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

const COUNTER_SQL = "select category, count(*) as orders, sum(amount) as revenue from orders group by 1 order by 1";
// One result that every visualization type can draw something from
const ALL_TYPES_SQL = `select c.name as word, c.country_code, c.lat, c.lon, o.category as stage1, o.channel as stage2,
  c.name as stage3, count(*) as value
from orders o join cities c on c.id = o.city_id group by 1, 2, 3, 4, 5, 6, 7`;

const counterValue = (page: Page) => activePane(page).locator(".counter-visualization-value");
const counterLabel = (page: Page) => activePane(page).locator(".counter-visualization-label");
const confirm = (page: Page) => page.locator(".ant-modal-confirm");

test.describe("Editing, renaming and deleting visualizations", () => {
  let queryId: number;
  let counterId: number;

  test.beforeEach(async ({ api, seed }) => {
    queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V manage"), COUNTER_SQL);
    counterId = await createVisualizationViaApi(api, queryId, {
      type: "COUNTER",
      name: "Orders",
      options: { counterColName: "orders", rowNumber: 1, counterLabel: "Hardware orders" },
    });
  });

  test("an existing visualization can be edited and saved again", async ({ page, api }) => {
    await openViewPage(page, queryId, counterId);
    await expect(counterValue(page)).toHaveText("163");
    await expect(counterLabel(page)).toHaveText("Hardware orders");

    await editVisualization(page);
    // The type cannot be changed any more
    await expect(byTest(page, "VisualizationType")).toHaveClass(/ant-select-disabled/);
    await expect(byTest(page, "VisualizationName")).toHaveValue("Orders");
    await typeIn(page, "Counter.General.ValueRowNumber", "2");
    await typeIn(page, "Counter.General.Label", "Services orders");
    const saved = await saveVisualization(page);
    expect(saved.id).toBe(counterId);
    await expect(toast(page)).toContainText("Visualization saved");

    expect((await savedVisualization(api, queryId, counterId)).options).toMatchObject({
      counterColName: "orders",
      rowNumber: 2,
      counterLabel: "Services orders",
    });
    expect(await savedVisualizations(api, queryId)).toHaveLength(2);
    await expect(counterValue(page)).toHaveText("158");
    await expect(counterLabel(page)).toHaveText("Services orders");
    await page.reload();
    await expect(counterValue(page)).toHaveText("158");
    await expect(counterLabel(page)).toHaveText("Services orders");
  });

  test("renaming a visualization in the editor renames its tab", async ({ page, api }) => {
    await openViewPage(page, queryId, counterId);
    await expect(visualizationTab(page, counterId)).toHaveText("Orders");
    await editVisualization(page);
    await nameVisualization(page, "Orders renamed");
    await saveVisualization(page);

    await expect(toast(page)).toContainText("Visualization saved");
    await expect(visualizationTab(page, counterId)).toHaveText("Orders renamed");
    expect((await savedVisualization(api, queryId, counterId)).name).toBe("Orders renamed");
    await page.reload();
    await expect(visualizationTab(page, counterId)).toHaveText("Orders renamed");
  });

  test("Cancel with unsaved changes asks before closing the editor", async ({ page, api }) => {
    await openViewPage(page, queryId, counterId);
    await editVisualization(page);
    await typeIn(page, "Counter.General.Label", "should not be saved");
    await expect(dialog(page).locator(".counter-visualization-label")).toHaveText("should not be saved");
    const cancel = dialog(page).locator(".ant-modal-footer .ant-btn:not(.ant-btn-primary)");

    await cancel.click();
    await expect(confirm(page)).toContainText("Are you sure you want to close the editor without saving?");
    // "No" keeps the editor and what was typed
    await confirm(page).getByRole("button", { name: "No" }).click();
    await expect(confirm(page)).toHaveCount(0);
    await expect(editor(page)).toBeVisible();
    await expect(byTest(page, "Counter.General.Label")).toHaveValue("should not be saved");

    // "Yes" closes it and nothing is saved
    await cancel.click();
    await confirm(page).getByRole("button", { name: "Yes" }).click();
    await expect(editor(page)).toHaveCount(0);
    await expect(counterLabel(page)).toHaveText("Hardware orders");
    expect((await savedVisualization(api, queryId, counterId)).options.counterLabel).toBe("Hardware orders");
  });

  test("an unchanged editor closes without asking", async ({ page }) => {
    await openViewPage(page, queryId, counterId);
    await editVisualization(page);
    await dialog(page).locator(".ant-modal-footer .ant-btn:not(.ant-btn-primary)").click();
    await expect(editor(page)).toHaveCount(0);
    await expect(confirm(page)).toHaveCount(0);
  });

  test("the x on a tab deletes the visualization after confirmation", async ({ page, api }) => {
    // Deleting is offered on the editor page of the query
    await openSourcePage(page, queryId);
    await clickVisualizationTab(page, counterId);
    const tab = visualizationTab(page, counterId);
    await expect(activePane(page).locator(".counter-visualization-value")).toHaveText("163");

    await tab.locator(".delete-visualization-button").click();
    await expect(confirm(page)).toContainText("Delete Visualization");
    await confirm(page).getByRole("button", { name: "Cancel" }).click();
    await expect(confirm(page)).toHaveCount(0);
    await expect(tab).toHaveCount(1);
    expect(await savedVisualizations(api, queryId)).toHaveLength(2);

    await tab.locator(".delete-visualization-button").click();
    await confirm(page).getByRole("button", { name: "Delete" }).click();
    await expect(tab).toHaveCount(0);
    await expect.poll(async () => (await savedVisualizations(api, queryId)).map((v) => v.type)).toEqual(["TABLE"]);
    // The remaining table is shown, and it cannot be deleted
    await expect(tabs(page).locator(".ant-tabs-tab-active")).toHaveText("Table");
    await expect(byTest(activePane(page), "TableVisualization")).toBeVisible();
    await expect(tabs(page).locator(".ant-tabs-tab").first().locator(".delete-visualization-button")).toHaveCount(0);
    await dismissToasts(page);
  });
});

test.describe("Switching between visualization tabs", () => {
  // What to measure in the pane of each type; `fills` marks the types that size themselves to the pane
  const TYPES: { type: string; selector: string; fills: boolean; options: Record<string, unknown> }[] = [
    {
      type: "MAP",
      selector: ".map-visualization-container",
      fills: true,
      options: { latColName: "lat", lonColName: "lon" },
    },
    {
      type: "CHOROPLETH",
      selector: ".map-visualization-container",
      fills: true,
      options: { mapType: "countries", keyColumn: "country_code", targetField: "iso_a2", valueColumn: "value" },
    },
    { type: "SANKEY", selector: ".sankey-visualization-container svg", fills: true, options: {} },
    {
      type: "SUNBURST_SEQUENCE",
      selector: ".sunburst-visualization-container .sunburst-container svg",
      fills: true,
      options: {},
    },
    {
      type: "WORD_CLOUD",
      selector: ".word-cloud-visualization-container svg",
      fills: true,
      options: { column: "word", frequenciesColumn: "value" },
    },
    {
      type: "COUNTER",
      selector: ".counter-visualization-container",
      fills: false,
      options: { counterColName: "value" },
    },
    { type: "PIVOT", selector: '[data-test="PivotTableVisualization"]', fills: false, options: {} },
    { type: "DETAILS", selector: ".details-viz", fills: false, options: {} },
    {
      type: "FUNNEL",
      selector: ".funnel-visualization-container",
      fills: false,
      options: {
        stepCol: { colName: "word", displayAs: "Word" },
        valueCol: { colName: "value", displayAs: "Value" },
      },
    },
    { type: "COHORT", selector: ".cohort-visualization-container, .cornelius-container", fills: false, options: {} },
  ];
  type Sizes = Record<string, { width: number; height: number }>;

  async function seedAllTypes(api: RedashApi, dataSourceId: number) {
    const queryId = await seedQuery(api, dataSourceId, uniqueName("V all types"), ALL_TYPES_SQL);
    const ids: Record<string, number> = {};
    for (const { type, options } of TYPES) {
      ids[type] = await createVisualizationViaApi(api, queryId, { type, name: `All ${type}`, options });
    }
    const table = (await savedVisualizations(api, queryId)).find((v) => v.type === "TABLE");
    return { queryId, ids, tableId: table?.id as number };
  }

  /** Clicks through the tabs in the given order and returns the size of what each pane shows. */
  async function clickThrough(page: Page, ids: Record<string, number>, order: typeof TYPES, minHeight: number) {
    const sizes: Sizes = {};
    let viaMenu = 0;
    for (const { type, selector, fills } of order) {
      viaMenu += (await clickVisualizationTab(page, ids[type])) === "menu" ? 1 : 0;
      if (type === "COHORT") {
        // No columns are mapped: the cohort draws nothing, its pane is just there
        await expect(activePane(page)).toBeVisible();
        continue;
      }
      const content = activePane(page).locator(selector).first();
      await expect(content, type).toBeVisible();
      // Self-sizing types must fill the pane: never a strip of zero or a few pixels
      await expect
        .poll(async () => (await content.boundingBox())?.height ?? 0, { message: `${type} height` })
        .toBeGreaterThan(fills ? minHeight : 30);
      const box = await content.boundingBox();
      expect(box?.width, `${type} width`).toBeGreaterThan(fills ? minHeight : 100);
      sizes[type] = { width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) };
    }
    return { sizes, viaMenu };
  }

  const filling = (sizes: Sizes) =>
    Object.fromEntries(TYPES.filter((entry) => entry.fills).map((entry) => [entry.type, sizes[entry.type]]));

  test("every visualization keeps its full size on the view page, in both directions", async ({ page, api, seed }) => {
    await stubMapTiles(page);
    const { queryId, ids, tableId } = await seedAllTypes(api, seed.dataSources.postgres);
    await openViewPage(page, queryId, tableId);

    const first = await clickThrough(page, ids, TYPES, 350);
    // Eleven tabs do not fit in the bar: the last ones are reached through the "..." menu
    expect(first.viaMenu).toBeGreaterThan(0);
    // Wide types take the width of the pane
    const pane = await activePane(page).boundingBox();
    for (const type of ["MAP", "CHOROPLETH", "SANKEY"]) {
      expect(Math.abs(first.sizes[type].width - (pane?.width ?? 0)), `${type} is as wide as the pane`).toBeLessThan(40);
    }

    // Again in reverse order: every pane was hidden in between and must come back at the same size
    const second = await clickThrough(page, ids, [...TYPES].reverse(), 350);
    expect(filling(second.sizes)).toEqual(filling(first.sizes));
  });

  test("every visualization keeps its size on the query editor page, also in a smaller window", async ({
    page,
    api,
    seed,
  }) => {
    await stubMapTiles(page);
    const { queryId, ids } = await seedAllTypes(api, seed.dataSources.postgres);
    await openSourcePage(page, queryId);
    const large = await clickThrough(page, ids, TYPES, 250);
    const again = await clickThrough(page, ids, [...TYPES].reverse(), 250);
    expect(filling(again.sizes)).toEqual(filling(large.sizes));

    await page.setViewportSize({ width: 1000, height: 700 });
    const small = await clickThrough(page, ids, TYPES, 120);
    for (const type of ["MAP", "CHOROPLETH", "SANKEY"]) {
      expect(small.sizes[type].width, `${type} is narrower in the smaller window`).toBeLessThan(
        large.sizes[type].width
      );
    }
  });

  test("a link to a visualization opens its tab at full size", async ({ page, api, seed }) => {
    await stubMapTiles(page);
    const { queryId, ids } = await seedAllTypes(api, seed.dataSources.postgres);
    for (const type of ["MAP", "SUNBURST_SEQUENCE", "WORD_CLOUD", "SANKEY"]) {
      const { selector } = TYPES.find((entry) => entry.type === type) as (typeof TYPES)[number];
      await page.goto(`/queries/${queryId}#${ids[type]}`);
      await page.reload();
      await expect(tabs(page).locator(".ant-tabs-tab-active")).toHaveText(`All ${type}`, { timeout: 30_000 });
      const content = activePane(page).locator(selector).first();
      await expect(content).toBeVisible();
      await expect.poll(async () => (await content.boundingBox())?.height ?? 0, { message: type }).toBeGreaterThan(350);
      expect((await content.boundingBox())?.width, type).toBeGreaterThan(350);
    }
  });
});
