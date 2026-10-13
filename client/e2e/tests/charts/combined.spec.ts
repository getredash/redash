import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createVisualizationViaApi } from "../../support/ui";
import {
  archiveQueries,
  choose,
  editorTab,
  expectPlot,
  mapColumn,
  newChart,
  openQuery,
  overlaps,
  pageChart,
  plot,
  preview,
  readPlot,
  savedOptions,
  saveVisualization,
  seedQueries,
  setInput,
} from "./helpers";

const MONTH_LABELS = Array.from({ length: 10 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

/** The y values of the avg_gap trace, rounded; NULL stays null. */
const gapValues = (page: Page) =>
  readPlot(preview(page), (gd) =>
    gd.data.find((d: any) => /avg_gap/.test(d.name)).y.map((v: number | null) => (v == null ? null : Math.round(v)))
  );

test.describe("Chart editor: combined charts, two Y axes, NULL values", () => {
  let queries: { combined: number };

  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["combined"]);
  });
  const cleanup: Record<string, number>[] = [];
  test.afterAll(async ({ api }) => {
    for (const ids of [queries, ...cleanup]) {
      await archiveQueries(api, ids);
    }
  });

  /** A bar chart with X = month_label (text like "2026-01") forced to a category axis, and the given Y columns. */
  async function startCategoryBars(page: Page, yColumns: string[], queryId = queries.combined) {
    await openQuery(page, queryId);
    await newChart(page, uniqueName("C combined"));
    await mapColumn(page, "x", "month_label");
    for (const column of yColumns) {
      await mapColumn(page, "y", column);
    }
    await editorTab(page, "XAxis");
    await choose(page, "Chart.XAxis.Type", "Chart.XAxis.Type.Category");
    await expectPlot(preview(page), { xType: "category", xTicks: MONTH_LABELS });
  }

  test("X scale Auto Detect reads '2026-01' strings as dates; Category shows them as text", async ({ page, api }) => {
    await openQuery(page, queries.combined);
    await newChart(page, uniqueName("C combined"));
    await mapColumn(page, "x", "month_label");
    await mapColumn(page, "y", "orders");
    await expectPlot(preview(page), { traces: ["bar:orders"], xType: "date" });
    expect((await plot(preview(page))).xTicks[0]).toBe("Jan 2026");

    await editorTab(page, "XAxis");
    await choose(page, "Chart.XAxis.Type", "Chart.XAxis.Type.Category");
    await expectPlot(preview(page), { xType: "category", xTicks: MONTH_LABELS });

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.combined, saved.id)).xAxis.type).toBe("category");
    await expectPlot(pageChart(page), { xType: "category", xTicks: MONTH_LABELS });
  });

  test("Combined chart: bars, a line on the right Y axis and an area, with both axes named", async ({ page, api }) => {
    await startCategoryBars(page, ["orders", "revenue", "avg_gap"]);
    await expectPlot(preview(page), {
      traces: ["bar:orders", "bar:revenue", "bar:avg_gap"],
      legend: ["orders", "revenue", "avg_gap"],
    });

    await editorTab(page, "Series");
    await choose(page, "Chart.Series.revenue.Type", "Chart.ChartType.line");
    await byTest(page, "Chart.Series.revenue.UseRightAxis").check();
    await expectPlot(preview(page), { traces: ["bar:orders", "scatter/lines:revenue@y2", "bar:avg_gap"] });
    // Each axis fits its own series: orders and average amounts are below 1000, revenue is tens of thousands
    await expect(async () => {
      const drawn = await plot(preview(page));
      expect(drawn.yRange?.[1]).toBeLessThan(1000);
      expect(drawn.y2Range?.[1]).toBeGreaterThan(40_000);
    }).toPass();

    await choose(page, "Chart.Series.avg_gap.Type", "Chart.ChartType.scatter");
    await expectPlot(preview(page), { traces: ["bar:orders", "scatter/lines:revenue@y2", "scatter/markers:avg_gap"] });
    await choose(page, "Chart.Series.avg_gap.Type", "Chart.ChartType.area");
    await expectPlot(preview(page), {
      traces: ["bar:orders", "scatter/lines:revenue@y2", "scatter/lines:avg_gap"],
      fills: 1,
      bars: 10,
    });

    await setInput(page, "Chart.Series.orders.Label", "Orders (count)");
    await expectPlot(preview(page), { legend: ["Orders (count)", "revenue", "avg_gap"] });
    await setInput(page, "Chart.Series.revenue.Label", "Revenue (right)");
    await expectPlot(preview(page), { legend: ["Orders (count)", "Revenue (right)", "avg_gap"] });

    await editorTab(page, "YAxis");
    await setInput(page, "Chart.LeftYAxis.Name", "Orders / avg amount");
    await expectPlot(preview(page), { yTitle: "Orders / avg amount" });
    await setInput(page, "Chart.RightYAxis.Name", "Revenue");
    await expectPlot(preview(page), { y2Title: "Revenue" });
    await setInput(page, "Chart.RightYAxis.RangeMin", "0");
    await expect.poll(async () => (await plot(preview(page))).y2Range?.[0]).toBe(0);
    await setInput(page, "Chart.RightYAxis.RangeMax", "80000");
    await expectPlot(preview(page), { y2Range: [0, 80000] });
    expect((await plot(preview(page))).y2Ticks.slice(0, 3)).toEqual(["0", "10k", "20k"]);

    await byTest(page, "Chart.YAxis.AlignAtZero").click();
    await expect(byTest(page, "Chart.YAxis.AlignAtZero")).toHaveAttribute("aria-checked", "true");

    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await setInput(page, "Chart.DataLabels.NumberFormat", "0,0");
    // orders per month on the bars; the revenue of January on the line, without decimals once the format applies
    await expect.poll(async () => (await plot(preview(page))).labels).toContain("41,509");
    expect((await plot(preview(page))).labels.slice(0, 4)).toEqual(["67", "63", "77", "64"]);

    const before = await plot(preview(page));
    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.combined, saved.id);
    expect(options.seriesOptions).toMatchObject({
      orders: { name: "Orders (count)" },
      revenue: { type: "line", yAxis: 1, name: "Revenue (right)" },
      avg_gap: { type: "area" },
    });
    expect(options.yAxis).toMatchObject([
      { type: "linear", title: { text: "Orders / avg amount" } },
      { type: "linear", opposite: true, title: { text: "Revenue" }, rangeMin: 0, rangeMax: 80000 },
    ]);
    expect(options.alignYAxesAtZero).toBe(true);

    await expectPlot(pageChart(page), {
      traces: ["bar:Orders (count)", "scatter/lines+text:Revenue (right)@y2", "scatter/lines+text:avg_gap"],
      legend: before.legend,
      legendColors: before.legendColors,
      labels: before.labels,
      xTicks: MONTH_LABELS,
      yTitle: "Orders / avg amount",
      y2Title: "Revenue",
      y2Range: [0, 80000],
    });
  });

  test("Missing and NULL values: converted to 0 by default, or left out of the chart", async ({ page, api }) => {
    await startCategoryBars(page, ["avg_gap"]);
    await editorTab(page, "Series");
    await choose(page, "Chart.Series.avg_gap.Type", "Chart.ChartType.area");
    await expectPlot(preview(page), { fills: 1 });
    await editorTab(page, "General");

    // avg_gap is NULL in March and July
    await expect(byTest(page, "Chart.MissingValues")).toContainText("Convert to 0 and display in chart");
    const asZero = [620, 617, 0, 643, 684, 617, 0, 588, 513, 649];
    expect(await gapValues(page)).toEqual(asZero);

    await choose(page, "Chart.MissingValues", "Chart.MissingValues.Keep");
    await expect.poll(() => gapValues(page)).toEqual([620, 617, null, 643, 684, 617, null, 588, 513, 649]);
    // The line is broken at the gaps: three separate pieces
    await expect
      .poll(async () => {
        const d = await preview(page)
          .locator("g.scatterlayer path.js-line")
          .evaluateAll((paths) => paths.map((path) => path.getAttribute("d") || ""));
        return d.join("").split("M").length - 1;
      })
      .toBe(3);

    await choose(page, "Chart.MissingValues", "Chart.MissingValues.Zero");
    await expect.poll(() => gapValues(page)).toEqual(asZero);

    await choose(page, "Chart.MissingValues", "Chart.MissingValues.Keep");
    await expect.poll(async () => (await gapValues(page))[2]).toBeNull();
    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.combined, saved.id)).missingValuesAsZero).toBe(false);
  });

  test("the legend on the right does not cover the tick labels of the right Y axis", async ({ page, api }) => {
    knownIssue("legend-covers-right-axis");
    const id = await createVisualizationViaApi(api, queries.combined, {
      type: "CHART",
      name: uniqueName("C legend and right axis"),
      options: {
        globalSeriesType: "column",
        columnMapping: { month_label: "x", orders: "y", revenue: "y" },
        seriesOptions: {
          orders: { zIndex: 0, yAxis: 0, type: "column" },
          revenue: { zIndex: 1, yAxis: 1, type: "line" },
        },
        xAxis: { type: "category", labels: { enabled: true } },
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true, rangeMin: 0, rangeMax: 80000 }],
        legend: { enabled: true, placement: "auto", traceorder: "normal" },
      },
    });
    await openQuery(page, queries.combined, id);
    await expectPlot(pageChart(page), {
      traces: ["bar:orders", "scatter/lines:revenue@y2"],
      legend: ["orders", "revenue"],
    });
    const legendBox = (await plot(pageChart(page))).legendBox;
    const ticks = await pageChart(page)
      .locator("g.y2tick text")
      .evaluateAll((texts) =>
        texts.map((text) => {
          const b = text.getBoundingClientRect();
          return { text: text.textContent, box: [b.left, b.top, b.right, b.bottom] };
        })
      );
    expect(ticks.length).toBeGreaterThan(4);
    const covered = ticks.filter((tick) => overlaps(tick.box, legendBox)).map((tick) => tick.text);
    expect(covered, "right axis tick labels under the legend").toEqual([]);
  });

  test("the same data on a date X axis and on a category X axis: both tabs stay drawn at full size", async ({
    page,
    api,
    seed,
  }) => {
    // A query of its own, so its tab bar holds just the table and these two charts
    const own = await seedQueries(api, seed.dataSources.postgres, ["combined"]);
    cleanup.push(own);
    await startCategoryBars(page, ["orders", "revenue"], own.combined);
    const category = await saveVisualization(page);
    await expectPlot(pageChart(page), { xType: "category", xTicks: MONTH_LABELS, bars: 20 });
    const categorySize = await plot(pageChart(page));

    // Same columns on the real date column, with a tick format
    await newChart(page, uniqueName("C combined date"));
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "orders");
    await mapColumn(page, "y", "revenue");
    await expectPlot(preview(page), { xType: "date", traces: ["bar:orders", "bar:revenue"] });
    await editorTab(page, "XAxis");
    await setInput(page, "Chart.XAxis.TickFormat", "%b %d");
    await expect.poll(async () => (await plot(preview(page))).xTicks[0]).toBe("Jan 01");
    const date = await saveVisualization(page);
    expect((await savedOptions(api, own.combined, date.id)).xAxis.tickFormat).toBe("%b %d");
    await expectPlot(pageChart(page), { xType: "date", width: categorySize.width, height: categorySize.height });
    expect((await plot(pageChart(page))).xTicks[0]).toBe("Jan 01");

    // Switching between the two tabs redraws each at the same size, with a full-height plot
    for (const [tab, xType] of [
      [category.id, "category"],
      [date.id, "date"],
      [category.id, "category"],
    ] as const) {
      await byTest(page, `QueryPageVisualizationTab${tab}`).click();
      await expectPlot(pageChart(page), { xType, bars: 20, width: categorySize.width, height: categorySize.height });
      const drawn = await plot(pageChart(page));
      const plotBox = drawn.plotBox as number[];
      expect(plotBox[3] - plotBox[1]).toBeGreaterThan(drawn.height * 0.7);
    }
  });
});
