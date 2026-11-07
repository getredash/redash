import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, centerOf, createVisualizationViaApi } from "../../support/ui";
import {
  choose,
  editorTab,
  hoverAt,
  newVisualization,
  openSourcePage,
  openViewPage,
  overtype,
  preview,
  savedVisualization,
  saveVisualization,
  seedQuery,
  typeIn,
  SLOW_INSTANCE_TIMEOUT,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// Four rows, ordered by category: Hardware, Services, Software, Training
const COUNTER_SQL =
  "select category, sum(amount) as revenue, 60000.5 as target, count(*) as orders from orders group by 1 order by 1";
const FUNNEL_SQL = `select stage, count(distinct user_id) as users,
  case stage when 'visit' then 1 when 'signup' then 2 when 'trial' then 3 else 4 end as step_order
from events group by 1`;

const counter = (scope: Page | Locator) => scope.locator(".counter-visualization-container").first();
const value = (scope: Page | Locator) => counter(scope).locator(".counter-visualization-value");
const target = (scope: Page | Locator) => counter(scope).locator(".counter-visualization-target");
const label = (scope: Page | Locator) => counter(scope).locator(".counter-visualization-label");

/** The factor the counter's content is scaled by to fit its pane. */
async function counterScale(page: Page): Promise<number> {
  return counter(page)
    .locator(".counter-visualization-content")
    .evaluate((content) => {
      const scaled = [content, ...Array.from(content.querySelectorAll("*"))]
        .map((element) => getComputedStyle(element).transform)
        .find((transform) => transform.startsWith("matrix") && transform !== "matrix(1, 0, 0, 1, 0, 0)");
      return scaled ? Number(scaled.slice(7).split(",")[0]) : 1;
    });
}

/** Rows of the funnel as cell texts, plus the width of the bar in each row. */
function funnelRows(scope: Page | Locator): Promise<string[][]> {
  return scope
    .locator(".funnel-visualization-container")
    .first()
    .locator("tbody tr")
    .evaluateAll((trs) => trs.map((tr) => Array.from(tr.children).map((td) => (td.textContent || "").trim())));
}

test.describe("Counter visualization", () => {
  test("the editor sets label, value, target and number format", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V counter"), COUNTER_SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "COUNTER", "Counter A");
    const pv = preview(page);
    // Nothing is selected yet: only the name is shown, as the label
    await expect(label(pv)).toHaveText("Counter A");
    await expect(value(pv)).toHaveText("");

    await typeIn(page, "Counter.General.Label", "Revenue vs target");
    await expect(label(pv)).toHaveText("Revenue vs target");
    await choose(page, "Counter.General.ValueColumn", "Counter.General.ValueColumn.revenue");
    await expect(value(pv)).toHaveText("100,671");
    await typeIn(page, "Counter.General.ValueRowNumber", "2");
    await expect(value(pv)).toHaveText("102,848");
    await expect(value(pv)).toHaveAttribute("title", "102,848.440");
    await expect(target(pv)).toHaveCount(0);
    await expect(counter(pv)).not.toHaveClass(/trend-/);

    // A target: shown in brackets, the value above it is a positive trend
    await choose(page, "Counter.General.TargetValueColumn", "Counter.General.TargetValueColumn.target");
    await expect(target(pv)).toHaveText("(60000.50)");
    await expect(counter(pv)).toHaveClass(/trend-positive/);

    await editorTab(page, "Format");
    await typeIn(page, "Counter.Formatting.DecimalPlace", "2");
    await expect(value(pv)).toHaveText("102,848.44");
    await typeIn(page, "Counter.Formatting.DecimalCharacter", ",");
    await typeIn(page, "Counter.Formatting.ThousandsSeparator", ".");
    await expect(value(pv)).toHaveText("102.848,44");
    await typeIn(page, "Counter.Formatting.StringPrefix", "$");
    await typeIn(page, "Counter.Formatting.StringSuffix", " USD");
    await expect(value(pv)).toHaveText("$102.848,44 USD");
    await expect(target(pv)).toHaveText("(60000.50)");
    await byTest(page, "Counter.Formatting.FormatTargetValue").click();
    await expect(target(pv)).toHaveText("($60.000,50 USD)");

    // Count rows: the value is the number of rows (4), now below the target
    await editorTab(page, "General");
    await byTest(page, "Counter.General.CountRows").click();
    await expect(value(pv)).toHaveText("$4,00 USD");
    await expect(counter(pv)).toHaveClass(/trend-negative/);
    await byTest(page, "Counter.General.CountRows").click();
    await expect(value(pv)).toHaveText("$102.848,44 USD");

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      countRow: false,
      rowNumber: 2,
      counterLabel: "Revenue vs target",
      stringPrefix: "$",
      stringSuffix: " USD",
      stringDecChar: ",",
      stringDecimal: 2,
      stringThouSep: ".",
      targetColName: "target",
      counterColName: "revenue",
      targetRowNumber: 1,
      formatTargetValue: true,
    });

    await openViewPage(page, queryId, saved.id);
    await expect(value(page)).toHaveText("$102.848,44 USD");
    await expect(target(page)).toHaveText("($60.000,50 USD)");
    await expect(label(page)).toHaveText("Revenue vs target");
    await expect(counter(page)).toHaveClass(/trend-positive/);
  });

  test("the number is scaled to fit when the window is resized", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V counter size"), COUNTER_SQL);
    const id = await createVisualizationViaApi(api, queryId, {
      type: "COUNTER",
      name: "Counter",
      options: {
        counterColName: "revenue",
        rowNumber: 2,
        targetColName: "target",
        targetRowNumber: 1,
        stringDecimal: 2,
        stringDecChar: ",",
        stringThouSep: ".",
        stringPrefix: "$",
        stringSuffix: " USD",
        formatTargetValue: true,
        counterLabel: "Revenue vs target",
      },
    });
    await openViewPage(page, queryId, id);
    await expect(value(page)).toHaveText("$102.848,44 USD");

    /** The value's box must be inside the counter's box: nothing is cut off. */
    const fits = async () => {
      const outer = await counter(page).boundingBox();
      const inner = await value(page).boundingBox();
      return !!outer && !!inner && inner.x >= outer.x - 1 && inner.x + inner.width <= outer.x + outer.width + 1;
    };
    await expect.poll(() => counterScale(page)).toBeLessThan(1);
    await expect.poll(fits).toBe(true);
    const wide = await counterScale(page);
    const wideWidth = (await value(page).boundingBox())?.width ?? 0;
    expect(wide).toBeGreaterThan(0.5);

    // The hint of the value is the unformatted number
    await hoverAt(page, await centerOf(value(page)));
    await expect(value(page)).toHaveAttribute("title", "102,848.440");

    await page.setViewportSize({ width: 800, height: 600 });
    await expect.poll(() => counterScale(page)).toBeLessThan(wide - 0.05);
    await expect.poll(fits).toBe(true);
    expect((await value(page).boundingBox())?.width ?? 0).toBeLessThan(wideWidth);

    await page.setViewportSize({ width: 480, height: 420 });
    await expect.poll(fits).toBe(true);
    await expect(value(page)).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => counterScale(page)).toBeCloseTo(wide, 2);
    await expect
      .poll(async () => Math.round((await value(page).boundingBox())?.width ?? 0))
      .toBe(Math.round(wideWidth));
  });
});

test.describe("Funnel visualization", () => {
  test("the editor sets columns, sorting, formats, the item limit and the percent range", async ({
    page,
    api,
    seed,
  }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V funnel"), FUNNEL_SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "FUNNEL", "Funnel A");
    const pv = preview(page);
    const head = pv.locator(".funnel-visualization-container thead th");

    await choose(page, "Funnel.StepColumn", "Funnel.StepColumn.stage");
    await choose(page, "Funnel.ValueColumn", "Funnel.ValueColumn.users");
    await typeIn(page, "Funnel.StepColumnTitle", "Stage");
    await expect(head.first()).toHaveText("Stage");
    await typeIn(page, "Funnel.ValueColumnTitle", "Users");
    await expect(head).toHaveText(["Stage", "Users", "% Max", "% Previous"]);
    // By default the steps are sorted by value, largest first
    await expect
      .poll(() => funnelRows(pv))
      .toEqual([
        ["visit", "204", "100%", "100%"],
        ["signup", "187", "91.67%", "91.67%"],
        ["trial", "174", "85.29%", "93.05%"],
        ["paid", "159", "77.94%", "91.38%"],
      ]);
    // The bars are as wide as the share of the largest value
    const bars = pv.locator(".funnel-visualization-container tbody tr td:nth-child(2) .funnel-bar-value");
    expect(
      await bars.evaluateAll((list) =>
        list.map((bar) => Math.round(parseFloat((bar as HTMLElement).style.width) * 10) / 10)
      )
    ).toEqual([100, 91.7, 85.3, 77.9]);

    await byTest(page, "Funnel.CustomSort").click();
    await choose(page, "Funnel.SortColumn", "Funnel.SortColumn.step_order");
    await choose(page, "Funnel.SortDirection", "Funnel.SortDirection.Descending");
    await expect
      .poll(() => funnelRows(pv))
      .toEqual([
        ["paid", "159", "77.94%", "100%"],
        ["trial", "174", "85.29%", "109.43%"],
        ["signup", "187", "91.67%", "107.47%"],
        ["visit", "204", "100%", "109.09%"],
      ]);
    await choose(page, "Funnel.SortDirection", "Funnel.SortDirection.Ascending");
    await expect
      .poll(async () => (await funnelRows(pv)).map((row) => row[0]))
      .toEqual(["visit", "signup", "trial", "paid"]);

    await editorTab(page, "Appearance");
    await typeIn(page, "Funnel.NumberFormat", "0,0.0");
    await expect
      .poll(async () => (await funnelRows(pv)).map((row) => row[1]))
      .toEqual(["204.0", "187.0", "174.0", "159.0"]);
    await typeIn(page, "Funnel.PercentFormat", "0.0%");
    await expect
      .poll(() => funnelRows(pv))
      .toEqual([
        ["visit", "204.0", "100.0%", "100.0%"],
        ["signup", "187.0", "91.7%", "91.7%"],
        ["trial", "174.0", "85.3%", "93.0%"],
        ["paid", "159.0", "77.9%", "91.4%"],
      ]);
    await typeIn(page, "Funnel.ItemsLimit", "3");
    await expect.poll(async () => (await funnelRows(pv)).map((row) => row[0])).toEqual(["visit", "signup", "trial"]);
    // The two range fields share one debounce: an edit that is followed by another within 200 ms is dropped. Wait
    // for each edit to show in the table before the next one (a minimum of 88 puts "<88.0%" on the trial row).
    await overtype(byTest(page, "Funnel.PercentRangeMin").first(), "88");
    await expect.poll(async () => (await funnelRows(pv))[2]).toEqual(["trial", "174.0", "<88.0%", "93.0%"]);
    await overtype(byTest(page, "Funnel.PercentRangeMin").first(), "50");
    await expect.poll(async () => (await funnelRows(pv))[2]).toEqual(["trial", "174.0", "85.3%", "93.0%"]);
    await overtype(byTest(page, "Funnel.PercentRangeMax").first(), "90");
    // Percentages above the range are shown as ">90.0%"
    const clipped = [
      ["visit", "204.0", ">90.0%", ">90.0%"],
      ["signup", "187.0", ">90.0%", ">90.0%"],
      ["trial", "174.0", "85.3%", ">90.0%"],
    ];
    await expect.poll(() => funnelRows(pv)).toEqual(clipped);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      stepCol: { colName: "stage", displayAs: "Stage" },
      valueCol: { colName: "users", displayAs: "Users" },
      autoSort: false,
      sortKeyCol: { colName: "step_order", reverse: false },
      itemsLimit: 3,
      numberFormat: "0,0.0",
      percentFormat: "0.0%",
      percentValuesRange: { min: 50, max: 90 },
    });

    await openViewPage(page, queryId, saved.id);
    await expect(page.locator(".funnel-visualization-container thead th")).toHaveText([
      "Stage",
      "Users",
      "% Max",
      "% Previous",
    ]);
    await expect.poll(() => funnelRows(page)).toEqual(clipped);
  });
});
