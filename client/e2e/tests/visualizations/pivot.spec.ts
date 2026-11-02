import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createVisualizationViaApi } from "../../support/ui";
import {
  editVisualization,
  newVisualization,
  openSourcePage,
  openViewPage,
  preview,
  savedVisualization,
  saveVisualization,
  seedQuery,
  SLOW_INSTANCE_TIMEOUT,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

const SQL = `select o.category, o.channel, to_char(o.created_at, 'YYYY-MM') as month, c.country, o.quantity, o.amount
from orders o join cities c on c.id = o.city_id`;

// Counts and sums of all 600 orders by category (rows) and channel (columns)
const COUNT_TABLE = [
  " | channel | direct | partner | web | Totals",
  "category | ",
  "Hardware | 52 | 49 | 62 | 163",
  "Services | 55 | 49 | 54 | 158",
  "Software | 46 | 59 | 39 | 144",
  "Training | 36 | 46 | 53 | 135",
  "Totals | 189 | 203 | 208 | 600",
];
const SUM_TABLE = [
  " | channel | direct | partner | web | Totals",
  "category | ",
  "Hardware | 35,405.98 | 31,536.58 | 33,728.49 | 100,671.05",
  "Services | 37,070.42 | 31,590.93 | 34,187.09 | 102,848.44",
  "Software | 29,212.55 | 36,242.45 | 20,839.19 | 86,294.19",
  "Training | 16,993.63 | 22,961.08 | 39,025.25 | 78,979.96",
  "Totals | 118,682.58 | 122,331.04 | 127,780.02 | 368,793.64",
];

const pivot = (scope: Page | Locator) => byTest(scope, "PivotTableVisualization").first();

/** The fields in the three drop zones. */
function zones(scope: Page | Locator): Promise<{ unused: string[]; rows: string[]; cols: string[] }> {
  return pivot(scope).evaluate((container) => {
    const texts = (selector: string) =>
      Array.from(container.querySelectorAll(selector)).map((element) =>
        (element.textContent || "").replace(/[▾▴]/g, "").trim()
      );
    return { unused: texts(".pvtUnused .pvtAttr"), rows: texts(".pvtRows .pvtAttr"), cols: texts(".pvtCols .pvtAttr") };
  });
}

/** The rows of the pivot table, cells joined with " | ". */
function pivotTable(scope: Page | Locator): Promise<string[]> {
  return pivot(scope)
    .locator("table.pvtTable tr")
    .evaluateAll((trs) =>
      trs.map((tr) =>
        Array.from(tr.children)
          .map((cell) => cell.textContent || "")
          .join(" | ")
      )
    );
}

/** Drags a field with the real mouse into a drop zone (".pvtRows", ".pvtCols" or ".pvtUnused"). */
async function dragField(page: Page, scope: Page | Locator, name: string, zone: string) {
  const field = pivot(scope)
    .locator(".pvtAttr")
    .filter({ hasText: new RegExp(`^${name}`) })
    .first();
  await field.scrollIntoViewIfNeeded();
  const from = await field.boundingBox();
  const target = await pivot(scope).locator(zone).first().boundingBox();
  if (!from || !target) {
    throw new Error(`cannot drag "${name}" to ${zone}`);
  }
  const start = { x: from.x + from.width / 2 - 8, y: from.y + from.height / 2 };
  const end = { x: target.x + Math.min(40, target.width / 2), y: target.y + Math.min(25, target.height / 2) };
  await page.mouse.move(start.x, start.y, { steps: 8 });
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.move(start.x + 6, start.y + 6, { steps: 4 });
  await page.waitForTimeout(100);
  await page.mouse.move(end.x, end.y, { steps: 30 });
  await page.waitForTimeout(350);
  await page.mouse.move(end.x + 4, end.y + 3, { steps: 3 });
  await page.waitForTimeout(250);
  await page.mouse.up();
}

/**
 * Picks a value in one of the pivot's own dropdowns (renderer, aggregator, value field). The menu stays open
 * after a pick (that is how the pivot library works), so it is closed with a second click.
 */
async function pickFromDropdown(scope: Page | Locator, zone: string, index: number, text: string) {
  const current = pivot(scope).locator(`${zone} .pvtDropdownCurrent`).nth(index);
  await current.click();
  await pivot(scope)
    .locator(`${zone} .pvtDropdownMenu .pvtDropdownValue`)
    .filter({ hasText: new RegExp(`^${text}$`) })
    .first()
    .click();
  await expect(current).toContainText(text);
  const open = pivot(scope).locator(".pvtDropdownCurrentOpen");
  if ((await open.count()) > 0) {
    await open.first().click();
  }
  await expect(open).toHaveCount(0);
}

const plot = (scope: Page | Locator) => pivot(scope).locator(".js-plotly-plot");

test.describe("Pivot table visualization", () => {
  let queryId: number;

  test.beforeEach(async ({ api, seed }) => {
    queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V pivot"), SQL);
  });

  const withRowsAndColumns = (api: Parameters<typeof createVisualizationViaApi>[0], options = {}) =>
    createVisualizationViaApi(api, queryId, {
      type: "PIVOT",
      name: "Pivot",
      options: { rows: ["category"], cols: ["channel"], ...options },
    });

  test("fields dragged from the unused list become rows and columns", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "PIVOT", "Pivot A");
    const pv = preview(page);
    await expect
      .poll(() => zones(pv))
      .toEqual({ unused: ["amount", "category", "channel", "country", "month", "quantity"], rows: [], cols: [] });
    await expect.poll(() => pivotTable(pv)).toEqual(["Totals | 600"]);

    await dragField(page, pv, "category", ".pvtRows");
    await expect
      .poll(() => zones(pv))
      .toEqual({ unused: ["amount", "channel", "country", "month", "quantity"], rows: ["category"], cols: [] });
    await expect
      .poll(() => pivotTable(pv))
      .toEqual([
        "category | Totals",
        "Hardware | 163",
        "Services | 158",
        "Software | 144",
        "Training | 135",
        "Totals | 600",
      ]);

    await dragField(page, pv, "channel", ".pvtCols");
    await expect
      .poll(() => zones(pv))
      .toEqual({ unused: ["amount", "country", "month", "quantity"], rows: ["category"], cols: ["channel"] });
    await expect.poll(() => pivotTable(pv)).toEqual(COUNT_TABLE);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      rows: ["category"],
      cols: ["channel"],
      aggregatorName: "Count",
      rendererName: "Table",
    });

    // The controls work on the query page too
    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => pivotTable(page)).toEqual(COUNT_TABLE);
    await dragField(page, page, "country", ".pvtRows");
    await expect.poll(async () => (await zones(page)).rows).toEqual(["category", "country"]);
    await expect
      .poll(async () => (await pivotTable(page))[2])
      .toMatch(/^Hardware \| Australia \| \d+ \| \d+ \| \d+ \| \d+$/);
    expect((await pivotTable(page)).at(-1)).toBe(COUNT_TABLE[6]);

    // ... and a field dragged back to the unused list leaves the table
    await dragField(page, page, "country", ".pvtUnused");
    await expect.poll(async () => (await zones(page)).rows).toEqual(["category"]);
    expect((await zones(page)).unused.sort()).toEqual(["amount", "country", "month", "quantity"]);
    await expect.poll(() => pivotTable(page)).toEqual(COUNT_TABLE);
  });

  test("a field dragged from columns to rows leaves the columns", async ({ page, api }) => {
    knownIssue("pivot-move-duplicates-field");
    const id = await withRowsAndColumns(api);
    await openViewPage(page, queryId, id);
    await expect.poll(() => pivotTable(page)).toEqual(COUNT_TABLE);

    await dragField(page, page, "channel", ".pvtRows");
    await expect.poll(async () => (await zones(page)).rows).toContain("channel");
    await expect.poll(async () => (await zones(page)).cols).toEqual([]);
  });

  test("the aggregator and the renderers change what the pivot shows", async ({ page, api }) => {
    const id = await withRowsAndColumns(api);
    await openViewPage(page, queryId, id);
    await editVisualization(page);
    const pv = preview(page);
    await expect.poll(() => pivotTable(pv)).toEqual(COUNT_TABLE);

    await pickFromDropdown(pv, ".pvtVals", 0, "Sum");
    await pickFromDropdown(pv, ".pvtVals", 1, "amount");
    await expect.poll(() => pivotTable(pv)).toEqual(SUM_TABLE);
    await pickFromDropdown(pv, ".pvtVals", 0, "Average");
    await expect.poll(async () => (await pivotTable(pv))[2]).toBe("Hardware | 680.88 | 643.60 | 544.01 | 617.61");
    await pickFromDropdown(pv, ".pvtVals", 0, "Sum");
    await expect.poll(() => pivotTable(pv)).toEqual(SUM_TABLE);

    const shades = () =>
      pivot(pv)
        .locator("table.pvtTable td.pvtVal")
        .evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).style.backgroundColor));
    expect((await shades()).filter(Boolean)).toEqual([]);
    await pickFromDropdown(pv, ".pvtRenderers", 0, "Table Heatmap");
    await expect.poll(async () => new Set((await shades()).filter(Boolean)).size).toBe(12);
    const all = await shades();
    await pickFromDropdown(pv, ".pvtRenderers", 0, "Table Col Heatmap");
    await expect.poll(async () => (await shades()).join()).not.toBe(all.join());
    const byColumn = await shades();
    expect(new Set(byColumn).size).toBeGreaterThan(4);
    await pickFromDropdown(pv, ".pvtRenderers", 0, "Table Row Heatmap");
    await expect.poll(async () => (await shades()).join()).not.toBe(byColumn.join());
    expect(new Set(await shades()).size).toBeGreaterThan(4);
    expect(await pivotTable(pv)).toEqual(SUM_TABLE);

    await pickFromDropdown(pv, ".pvtRenderers", 0, "Exportable TSV");
    await expect(pivot(pv).locator("table.pvtTable")).toHaveCount(0);
    await expect(pivot(pv).locator(".pvtOutput textarea")).toHaveValue(
      /^category\tdirect\tpartner\tweb\nHardware\t35405\.9\d+\t31536\.5\d+\t33728\.4\d+\nServices\t/
    );

    // Charts: traces and points drawn for 4 categories x 3 channels
    const drawn = async () => ({
      traces: await plot(pv).locator(".trace").count(),
      points: await plot(pv).locator(".point").count(),
      slices: await plot(pv).locator(".slice").count(),
    });
    const charts: [string, { traces: number; points: number; slices: number }][] = [
      ["Grouped Column Chart", { traces: 4, points: 12, slices: 0 }],
      ["Stacked Column Chart", { traces: 4, points: 12, slices: 0 }],
      ["Grouped Bar Chart", { traces: 3, points: 12, slices: 0 }],
      ["Line Chart", { traces: 4, points: 12, slices: 0 }],
      ["Area Chart", { traces: 4, points: 0, slices: 0 }],
      ["Scatter Chart", { traces: 1, points: 12, slices: 0 }],
      ["Multiple Pie Chart", { traces: 3, points: 0, slices: 12 }],
    ];
    for (const [renderer, expected] of charts) {
      await pickFromDropdown(pv, ".pvtRenderers", 0, renderer);
      await expect(plot(pv), renderer).toBeVisible();
      await expect.poll(drawn, renderer).toEqual(expected);
      const box = await plot(pv).boundingBox();
      expect(box?.width, `${renderer} width`).toBeGreaterThan(500);
      expect(box?.height, `${renderer} height`).toBeGreaterThan(300);
    }

    await pickFromDropdown(pv, ".pvtRenderers", 0, "Stacked Column Chart");
    await saveVisualization(page);
    expect((await savedVisualization(api, queryId, id)).options).toMatchObject({
      aggregatorName: "Sum",
      vals: ["amount"],
      rendererName: "Stacked Column Chart",
      rows: ["category"],
      cols: ["channel"],
    });
    await expect(plot(page)).toBeVisible();
    await expect.poll(() => plot(page).locator(".point").count()).toBe(12);
  });

  test("the editor hides the controls and the totals", async ({ page, api }) => {
    const id = await withRowsAndColumns(api);
    await openViewPage(page, queryId, id);
    await expect(pivot(page).locator(".pvtRenderers")).toBeVisible();
    await editVisualization(page);
    const pv = preview(page);
    await expect.poll(() => pivotTable(pv)).toEqual(COUNT_TABLE);
    /** How many row totals (last column) and column totals (last row) are shown. */
    const totals = (scope: Page | Locator) =>
      pivot(scope)
        .locator("table.pvtTable")
        .evaluate((element) => {
          const shown = (selector: string) =>
            Array.from(element.querySelectorAll(selector)).filter((cell) => cell.getBoundingClientRect().width > 0)
              .length;
          return {
            row: shown(":scope > tbody > tr:not(:last-child) > td.pvtTotal"),
            column: shown(":scope > tbody > tr:last-child > td.pvtTotal"),
            grand: shown("td.pvtGrandTotal"),
          };
        });
    await expect.poll(() => totals(pv)).toEqual({ row: 4, column: 3, grand: 1 });

    await byTest(page, "PivotEditor.HideControls").click();
    await expect(pivot(pv)).toHaveAttribute("data-hide-controls", "true");
    await expect(pivot(pv).locator(".pvtRenderers")).toBeHidden();
    await expect(pivot(pv).locator(".pvtUnused")).toBeHidden();
    await expect(pivot(pv).locator("table.pvtTable")).toBeVisible();

    await page.locator("#pivot-show-row-totals").click();
    await expect(pivot(pv)).toHaveAttribute("data-hide-row-totals", "true");
    await expect.poll(() => totals(pv)).toEqual({ row: 0, column: 3, grand: 0 });
    await page.locator("#pivot-show-column-totals").click();
    await expect(pivot(pv)).toHaveAttribute("data-hide-column-totals", "true");
    await expect.poll(() => totals(pv)).toEqual({ row: 0, column: 0, grand: 0 });
    await page.locator("#pivot-show-row-totals").click();
    await expect.poll(() => totals(pv)).toEqual({ row: 4, column: 0, grand: 0 });

    await saveVisualization(page);
    // `controls.enabled` is the legacy, inverted flag: true means the controls are hidden
    expect((await savedVisualization(api, queryId, id)).options).toMatchObject({
      controls: { enabled: true },
      rendererOptions: { table: { rowTotals: true, colTotals: false } },
    });
    await expect(pivot(page)).toHaveAttribute("data-hide-controls", "true");
    await expect(pivot(page).locator(".pvtRenderers")).toBeHidden();
    await expect.poll(() => totals(page)).toEqual({ row: 4, column: 0, grand: 0 });
    await page.reload();
    await expect(pivot(page)).toHaveAttribute("data-hide-controls", "true");
    await expect(pivot(page).locator(".pvtRenderers")).toBeHidden();
    await expect(pivot(page).locator("table.pvtTable")).toBeVisible();

    // Edit the saved pivot: controls and totals back
    await editVisualization(page);
    await byTest(page, "PivotEditor.HideControls").click();
    await page.locator("#pivot-show-column-totals").click();
    await saveVisualization(page);
    expect((await savedVisualization(api, queryId, id)).options).toMatchObject({
      controls: { enabled: false },
      rendererOptions: { table: { rowTotals: true, colTotals: true } },
    });
    await expect(pivot(page).locator(".pvtRenderers")).toBeVisible();
    await expect.poll(() => pivotTable(page)).toEqual(COUNT_TABLE);

    // The filter popup of a field: unticking a value removes its rows
    await pivot(page)
      .locator(".pvtRows .pvtAttr")
      .filter({ hasText: /^category/ })
      .locator(".pvtTriangle")
      .click();
    const filter = pivot(page).locator(".pvtFilterBox").first();
    await expect(filter.locator(".pvtCheckContainer p")).toHaveText([/Hardware/, /Services/, /Software/, /Training/]);
    await filter.locator(".pvtCheckContainer p").filter({ hasText: "Hardware" }).click();
    await expect
      .poll(() => pivotTable(page))
      .toEqual([
        COUNT_TABLE[0],
        COUNT_TABLE[1],
        COUNT_TABLE[3],
        COUNT_TABLE[4],
        COUNT_TABLE[5],
        "Totals | 137 | 154 | 146 | 437",
      ]);
  });
});
