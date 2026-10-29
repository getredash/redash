import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, centerOf, drag } from "../../support/ui";
import {
  archiveQueries,
  chartType,
  choose,
  closeColorPicker,
  editor,
  editorTab,
  expectPlot,
  mapColumn,
  newChart,
  openColorPicker,
  openQuery,
  optionsOf,
  pageChart,
  plot,
  preview,
  readPlot,
  savedOptions,
  saveVisualization,
  seedQueries,
  seriesRows,
  setInput,
  typeCustomColor,
} from "./helpers";

const CATEGORIES = ["Hardware", "Services", "Software", "Training"];

/** The ticks of the date axis are months of 2026 (how many of the ten are labelled depends on the width). */
async function expectMonthTicks(chart: Locator, pattern = /^[A-Z][a-z]{2} 2026$/, first = "Jan 2026") {
  await expect(async () => {
    const { xType, xTicks } = await plot(chart);
    expect(xType).toBe("date");
    expect(xTicks.length).toBeGreaterThanOrEqual(5);
    expect(xTicks[0]).toBe(first);
    expect(xTicks.filter((tick) => !pattern.test(tick))).toEqual([]);
  }).toPass();
}
const DEFAULT_COLORS = ["rgb(53, 106, 255)", "rgb(233, 40, 40)", "rgb(59, 217, 115)", "rgb(96, 79, 233)"];

test.describe("Chart editor: a line chart on a date axis", () => {
  let queries: { monthly: number };

  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["monthly"]);
  });
  test.afterAll(async ({ api }) => {
    await archiveQueries(api, queries);
  });

  /** New Visualization -> Line, X = month, Y = revenue, group by category: built in the editor, as a user does. */
  async function startLineChart(page: Page, name = uniqueName("C line")) {
    await openQuery(page, queries.monthly);
    await newChart(page, name);
    await chartType(page, "line");
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "revenue");
    await mapColumn(page, "series", "category");
    await expectPlot(preview(page), { legend: CATEGORIES, lines: 4 });
    return name;
  }

  test("a query prepared for the charts shows its result table and offers New Visualization", async ({ page }) => {
    await openQuery(page, queries.monthly);
    const headers = byTest(page, "TableVisualization").locator("thead th").filter({ hasText: /\S/ });
    await expect(headers).toHaveText(["month", "category", "orders", "revenue", "avg_amount", "err"]);
    await expect(byTest(page, "TableVisualization").locator("tbody tr.ant-table-row").first()).toContainText(
      "Hardware"
    );
    await expect(byTest(page, "NewVisualization")).toBeEnabled();
  });

  test("Line chart on a date X axis draws one line per group and is saved", async ({ page, api }) => {
    const name = await startLineChart(page);
    await expectPlot(preview(page), {
      traces: CATEGORIES.map((category) => `scatter/lines:${category}`),
      lines: 4,
      legend: CATEGORIES,
      legendColors: DEFAULT_COLORS,
    });
    await expectMonthTicks(preview(page));
    // The legend is to the right of the plot
    const drawn = await plot(preview(page));
    expect(drawn.legendBox?.[0]).toBeGreaterThanOrEqual((drawn.plotBox?.[2] ?? 0) - 1);

    const saved = await saveVisualization(page);
    expect(saved.name).toBe(name);
    expect(saved.type).toBe("CHART");
    expect(saved.options.globalSeriesType).toBe("line");
    expect(saved.options.columnMapping).toEqual({ month: "x", revenue: "y", category: "series" });

    // The query page shows the new chart in its own tab, identical to the preview
    await expect(byTest(page, `QueryPageVisualizationTab${saved.id}`)).toContainText(name);
    await expectPlot(pageChart(page), {
      traces: drawn.traces,
      legend: CATEGORIES,
      legendColors: DEFAULT_COLORS,
    });
    await expectMonthTicks(pageChart(page));
    expect((await savedOptions(api, queries.monthly, saved.id)).globalSeriesType).toBe("line");
  });

  test("the chart type select offers the eight types and each one redraws the preview", async ({ page }) => {
    await startLineChart(page);
    expect(await optionsOf(page, "Chart.GlobalSeriesType")).toEqual([
      "Line",
      "Bar",
      "Area",
      "Pie",
      "Scatter",
      "Bubble",
      "Heatmap",
      "Box",
    ]);

    const traceTypes = () =>
      readPlot(preview(page), (gd) =>
        Array.from(new Set(gd.data.map((d: any) => `${d.type || "scatter"}/${d.mode}/${d.fill}`)))
      );
    await chartType(page, "column");
    await expect.poll(traceTypes).toEqual(["bar/undefined/undefined"]);
    await expectPlot(preview(page), { bars: 40 });
    await chartType(page, "area");
    await expect.poll(traceTypes).toEqual(["scatter/lines/tozeroy"]);
    await expectPlot(preview(page), { fills: 4 });
    await chartType(page, "pie");
    await expect.poll(traceTypes).toEqual(["pie/undefined/undefined"]);
    await expectPlot(preview(page), { slices: 40 });
    await chartType(page, "scatter");
    await expect.poll(traceTypes).toEqual(["scatter/markers/undefined"]);
    await chartType(page, "bubble");
    await expect.poll(traceTypes).toEqual(["scatter/markers/undefined"]);
    await expect(byTest(page, "Chart.ColumnMapping.size")).toBeVisible();
    await chartType(page, "heatmap");
    await expect.poll(traceTypes).toEqual(["heatmap/undefined/undefined"]);
    await expect(byTest(page, "Chart.ColumnMapping.zVal")).toBeVisible();
    await chartType(page, "box");
    await expect.poll(traceTypes).toEqual(["box/markers/undefined"]);
    await chartType(page, "line");
    await expect.poll(traceTypes).toEqual(["scatter/lines/undefined"]);
  });

  test("the Custom (JavaScript) chart type is not offered", async ({ page }) => {
    await openQuery(page, queries.monthly);
    await newChart(page);
    const types = await optionsOf(page, "Chart.GlobalSeriesType");
    expect(types).not.toContain("Custom");
    expect(types).toHaveLength(8);
  });

  test("X column, Y columns and group by are picked, extended and cleared in the selects", async ({ page }) => {
    await openQuery(page, queries.monthly);
    await newChart(page);
    await chartType(page, "line");
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "revenue");
    await expectPlot(preview(page), { traces: ["scatter/lines:revenue"], legend: ["revenue"] });

    // A second Y column adds a second trace; traces come in the order of the result's columns
    await mapColumn(page, "y", "orders");
    await expectPlot(preview(page), {
      traces: ["scatter/lines:orders", "scatter/lines:revenue"],
      legend: ["orders", "revenue"],
    });

    // Removing its tag removes the trace
    await byTest(page, "Chart.ColumnMapping.y")
      .locator(".ant-select-selection-item", { hasText: "orders" })
      .locator(".ant-select-selection-item-remove")
      .click();
    await expectPlot(preview(page), { traces: ["scatter/lines:revenue"] });

    await mapColumn(page, "series", "category");
    await expectPlot(preview(page), { legend: CATEGORIES, lines: 4 });

    // Clearing "Group by" with the select's clear button goes back to one trace
    const groupBy = byTest(page, "Chart.ColumnMapping.series");
    await groupBy.hover();
    await groupBy.locator(".ant-select-clear").click();
    await expectPlot(preview(page), { traces: ["scatter/lines:revenue"] });
  });

  test("legend placement: below the plot, hidden, right; legend order reversed and back", async ({ page, api }) => {
    await startLineChart(page);
    const right = await plot(preview(page));

    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.Below");
    await expect(async () => {
      const below = await plot(preview(page));
      expect(below.legend).toEqual(CATEGORIES);
      // under the plot, and the plot gave up height for it
      expect(below.legendBox?.[1]).toBeGreaterThanOrEqual(below.plotBox?.[3] ?? 0);
      expect(below.plotBox?.[3]).toBeLessThan(right.plotBox?.[3] ?? 0);
      expect(below.plotBox?.[2]).toBeGreaterThan(right.plotBox?.[2] ?? 0);
    }).toPass();

    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.HideLegend");
    await expectPlot(preview(page), { legend: [], legendBox: null, lines: 4 });
    await expect(byTest(page, "Chart.LegendItemsOrder")).toHaveCount(0);

    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.Auto");
    await expectPlot(preview(page), { legend: CATEGORIES, legendBox: right.legendBox });

    await choose(page, "Chart.LegendItemsOrder", "Chart.LegendItemsOrder.Reversed");
    await expectPlot(preview(page), { legend: [...CATEGORIES].reverse() });
    await choose(page, "Chart.LegendItemsOrder", "Chart.LegendItemsOrder.Normal");
    await expectPlot(preview(page), { legend: CATEGORIES });

    await choose(page, "Chart.LegendItemsOrder", "Chart.LegendItemsOrder.Reversed");
    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.Below");
    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).legend).toEqual({
      enabled: true,
      placement: "below",
      traceorder: "reversed",
    });
    await expectPlot(pageChart(page), { legend: [...CATEGORIES].reverse() });
  });

  test("line shape: spline and horizontal-vertical apply to every trace", async ({ page, api }) => {
    await startLineChart(page);
    await choose(page, "Chart.LineShape", "Chart.LineShape.Spline");
    await expectPlot(preview(page), { lineShapes: ["spline"] });
    await choose(page, "Chart.LineShape", "Chart.LineShape.HorizontalVertical");
    await expectPlot(preview(page), { lineShapes: ["hv"] });
    // A stepped line is drawn with horizontal and vertical segments only
    const path = await preview(page).locator("g.scatterlayer path.js-line").first().getAttribute("d");
    expect(path).toMatch(/^M[\d.,-]+(H[\d.-]+V[\d.-]+)+/);

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).lineShape).toBe("hv");
    await expectPlot(pageChart(page), { lineShapes: ["hv"] });
  });

  test("an errors column draws error bars and shows value ± error in the data labels", async ({ page, api }) => {
    await startLineChart(page);
    await mapColumn(page, "yError", "err");
    // 10 months x 4 categories
    await expectPlot(preview(page), { errorBars: 40 });
    expect(
      await readPlot(
        preview(page),
        (gd) => gd.data.filter((d: any) => d.error_y?.array?.length === 10 && d.error_y.visible !== false).length
      )
    ).toBe(4);

    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await expect.poll(async () => (await plot(preview(page))).labels[0]).toBe("9,340.52000 ± 116.50000");

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).columnMapping).toEqual({
      month: "x",
      revenue: "y",
      category: "series",
      err: "yError",
    });
    await expectPlot(pageChart(page), { errorBars: 40 });
  });

  test("X axis scale: Category shows the raw values, DateTime shows date ticks again", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "XAxis");
    await expect(byTest(page, "Chart.XAxis.Type")).toContainText("Auto Detect");

    await choose(page, "Chart.XAxis.Type", "Chart.XAxis.Type.Category");
    await expectPlot(preview(page), { xType: "category" });
    const categoryTicks = (await plot(preview(page))).xTicks;
    expect(categoryTicks).toHaveLength(10);
    expect(categoryTicks[0]).toBe("2026-01-01 00:00:00");
    expect(categoryTicks[9]).toBe("2026-10-01 00:00:00");

    await choose(page, "Chart.XAxis.Type", "Chart.XAxis.Type.DateTime");
    await expectMonthTicks(preview(page));

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).xAxis.type).toBe("datetime");
  });

  test("X axis name, tick format and Show Labels", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "XAxis");
    await setInput(page, "Chart.XAxis.Name", "Month of order");
    await expectPlot(preview(page), { xTitle: "Month of order" });

    await setInput(page, "Chart.XAxis.TickFormat", "%b %d");
    await expectMonthTicks(preview(page), /^[A-Z][a-z]{2} 01$/, "Jan 01");

    await byTest(page, "Chart.XAxis.ShowLabels").click();
    await expectPlot(preview(page), { xTicks: [], xTitle: "Month of order", lines: 4 });
    await byTest(page, "Chart.XAxis.ShowLabels").click();
    await expectMonthTicks(preview(page), /^[A-Z][a-z]{2} 01$/, "Jan 01");

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).xAxis).toMatchObject({
      labels: { enabled: true },
      title: { text: "Month of order" },
      tickFormat: "%b %d",
    });
    await expectPlot(pageChart(page), { xTitle: "Month of order" });
  });

  test("Y axis name, Min/Max values and logarithmic scale with automatic range", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "YAxis");
    await setInput(page, "Chart.LeftYAxis.Name", "Revenue (USD)");
    await expectPlot(preview(page), { yTitle: "Revenue (USD)", yType: "linear" });

    await choose(page, "Chart.LeftYAxis.Type", "Chart.LeftYAxis.Type.Logarithmic");
    await expectPlot(preview(page), { yType: "log", lines: 4 });
    const log = await plot(preview(page));
    // The range of a log axis is in exponents: the data (about 2.8k .. 19k) lies between 10^2.5 and 10^4.5
    expect(log.yRange?.[0]).toBeGreaterThan(2.5);
    expect(log.yRange?.[1]).toBeLessThan(4.5);
    expect(log.yTicks).toContain("1000");
    expect(log.yTicks.join(" ")).not.toContain("NaN");

    await choose(page, "Chart.LeftYAxis.Type", "Chart.LeftYAxis.Type.Linear");
    await setInput(page, "Chart.LeftYAxis.RangeMin", "1000");
    await expect.poll(async () => (await plot(preview(page))).yRange?.[0]).toBe(1000);
    await setInput(page, "Chart.LeftYAxis.RangeMax", "25000");
    await expectPlot(preview(page), {
      yType: "linear",
      yRange: [1000, 25000],
      yTicks: ["5k", "10k", "15k", "20k", "25k"],
    });

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).yAxis[0]).toMatchObject({
      type: "linear",
      title: { text: "Revenue (USD)" },
      rangeMin: 1000,
      rangeMax: 25000,
    });
    await expectPlot(pageChart(page), { yTitle: "Revenue (USD)", yRange: [1000, 25000] });
  });

  test("a logarithmic Y axis with Min and Max values shows the data between them", async ({ page }) => {
    knownIssue("log-axis-min-max");
    await startLineChart(page);
    await editorTab(page, "YAxis");
    // Linear with Min 1000 / Max 25000 works (see the test above); then switch the scale
    await setInput(page, "Chart.LeftYAxis.RangeMin", "1000");
    await expect.poll(async () => (await plot(preview(page))).yRange?.[0]).toBe(1000);
    await setInput(page, "Chart.LeftYAxis.RangeMax", "25000");
    await expectPlot(preview(page), { yType: "linear", yRange: [1000, 25000] });
    await choose(page, "Chart.LeftYAxis.Type", "Chart.LeftYAxis.Type.Logarithmic");
    await expectPlot(preview(page), { yType: "log" });
    const drawn = await plot(preview(page));
    expect(drawn.yTicks.length).toBeGreaterThan(0);
    expect(drawn.yTicks.join(" ")).not.toContain("NaN");
    // 10^3 .. 10^4.398
    expect(drawn.yRange?.[0]).toBeCloseTo(3, 1);
    expect(drawn.yRange?.[1]).toBeCloseTo(Math.log10(25000), 1);
  });

  test("Series tab: rename a series, draw one as bars, put one on the right axis", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "Series");
    expect(await optionsOf(page, "Chart.Series.Services.Type")).toEqual(["Line", "Bar", "Area", "Scatter"]);

    await setInput(page, "Chart.Series.Hardware.Label", "HW renamed");
    await expectPlot(preview(page), { legend: ["HW renamed", "Services", "Software", "Training"] });

    await choose(page, "Chart.Series.Services.Type", "Chart.ChartType.column");
    await expectPlot(preview(page), { bars: 10, lines: 3 });

    await byTest(page, "Chart.Series.Training.UseRightAxis").check();
    await expectPlot(preview(page), {
      traces: ["scatter/lines:HW renamed", "bar:Services", "scatter/lines:Software", "scatter/lines:Training@y2"],
    });
    // The second axis has its own ticks, drawn to the right of the plot
    const drawn = await plot(preview(page));
    expect(drawn.y2Ticks.length).toBeGreaterThan(2);
    const tick = await preview(page).locator("g.y2tick text").first().boundingBox();
    expect(tick?.x).toBeGreaterThanOrEqual((drawn.plotBox?.[2] ?? 0) - 1);

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).seriesOptions).toMatchObject({
      Hardware: { name: "HW renamed" },
      Services: { type: "column" },
      Training: { yAxis: 1 },
    });

    // The label, the type and the axis survive a reload
    await page.goto(`/queries/${queries.monthly}#${saved.id}`);
    await expectPlot(pageChart(page), {
      traces: ["scatter/lines:HW renamed", "bar:Services", "scatter/lines:Software", "scatter/lines:Training@y2"],
      legend: ["HW renamed", "Services", "Software", "Training"],
    });
  });

  test("Series tab: dragging a row by its handle reorders the series, legend and traces", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "Series");
    await setInput(page, "Chart.Series.Hardware.Label", "HW renamed");
    await expectPlot(preview(page), { legend: ["HW renamed", "Services", "Software", "Training"] });
    await byTest(page, "Chart.Series.Training.UseRightAxis").check();
    await choose(page, "Chart.Series.Services.Type", "Chart.ChartType.column");
    expect(await seriesRows(page)).toEqual(["Hardware#1", "Services#2", "Software#3", "Training#4"]);

    const rows = page.locator(".chart-editor-series tbody tr.sortable-element");
    const handleOf = async (index: number) => centerOf(rows.nth(index).locator(".drag-handle"));

    // Row 4 (Training) to the top; mid-drag the row is highlighted
    const from = await handleOf(3);
    const firstRow = await rows.nth(0).boundingBox();
    await page.mouse.move(from.x, from.y, { steps: 5 });
    await page.mouse.down();
    await page.mouse.move(from.x, from.y - 60, { steps: 10 });
    await expect(page.locator(".chart-editor-series-dragged-item")).toHaveCount(1);
    await page.mouse.move(from.x, (firstRow?.y ?? 0) + 6, { steps: 14 });
    await page.waitForTimeout(300); // let the list settle under the pointer before releasing
    await page.mouse.up();
    await expect.poll(() => seriesRows(page)).toEqual(["Training#1", "Hardware#2", "Services#3", "Software#4"]);
    await expectPlot(preview(page), {
      traces: ["scatter/lines:Training@y2", "scatter/lines:HW renamed", "bar:Services", "scatter/lines:Software"],
      legend: ["Training", "HW renamed", "Services", "Software"],
    });

    // Row 1 (Training) down to row 3
    const third = await rows.nth(2).boundingBox();
    const top = await handleOf(0);
    await drag(page, top, { x: top.x, y: (third?.y ?? 0) + (third?.height ?? 0) - 8 }, { steps: 16 });
    await expect.poll(() => seriesRows(page)).toEqual(["Hardware#1", "Services#2", "Training#3", "Software#4"]);
    await expectPlot(preview(page), { legend: ["HW renamed", "Services", "Training", "Software"] });

    // Label, axis and type stayed with their series
    await expect(byTest(page, "Chart.Series.Hardware.Label")).toHaveValue("HW renamed");
    await expect(byTest(page, "Chart.Series.Training.UseRightAxis")).toBeChecked();
    await expect(byTest(page, "Chart.Series.Services.Type")).toContainText("Bar");
    await expect(byTest(page, "Chart.Series.Software.UseLeftAxis")).toBeChecked();

    const saved = await saveVisualization(page);
    const order = (options: { seriesOptions: Record<string, { zIndex: number }> }) =>
      Object.entries(options.seriesOptions)
        .sort((a, b) => a[1].zIndex - b[1].zIndex)
        .map(([key]) => key);
    expect(order(await savedOptions(api, queries.monthly, saved.id))).toEqual([
      "Hardware",
      "Services",
      "Training",
      "Software",
    ]);
    await page.goto(`/queries/${queries.monthly}#${saved.id}`);
    await expectPlot(pageChart(page), { legend: ["HW renamed", "Services", "Training", "Software"] });
  });

  test("Colors tab: a colour scheme recolours all series", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "Colors");
    await choose(page, "ColorScheme", "ColorOptionTableau 10");
    const tableau = ["rgb(78, 121, 167)", "rgb(242, 142, 44)", "rgb(225, 87, 89)", "rgb(118, 183, 178)"];
    await expectPlot(preview(page), { legendColors: tableau });
    await choose(page, "ColorScheme", "ColorOptionD3 Category 10");
    const d3 = ["rgb(31, 119, 180)", "rgb(255, 127, 14)", "rgb(44, 160, 44)", "rgb(214, 39, 40)"];
    await expectPlot(preview(page), { legendColors: d3 });

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).color_scheme).toBe("D3 Category 10");
    await expectPlot(pageChart(page), { legendColors: d3 });
  });

  test("Colors tab: a preset picked in the colour picker recolours the series at once", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "Colors");
    await choose(page, "ColorScheme", "ColorOptionTableau 10");
    const picker = await openColorPicker(page, "Chart.Series.Hardware.Color");
    // ten presets of the scheme plus "automatic"
    await expect(picker.locator(".color-picker-input-swatches > *")).toHaveCount(11);

    await picker.locator(".color-picker-input-swatches > *").nth(3).click();
    await expect(picker.locator(".ant-card-head-title")).toHaveText("#76B7B2");
    await expect.poll(async () => (await plot(preview(page))).legendColors[0]).toBe("rgb(118, 183, 178)");

    // A click outside closes the picker
    await closeColorPicker(page);

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).seriesOptions.Hardware.color).toBe("#76B7B2");
  });

  test("Colors tab: a custom hex typed in the colour picker is applied and saved", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "Colors");
    await openColorPicker(page, "Chart.Series.Services.Color");
    await typeCustomColor(page, "FF00AA");
    await expect.poll(async () => (await plot(preview(page))).legendColors[1]).toBe("rgb(255, 0, 170)");
    await closeColorPicker(page);
    // The label next to the swatch shows the hex; untouched series say "Automatic"
    await expect(byTest(page, "Chart.Series.Services.Color")).toContainText("#FF00AA");
    await expect(byTest(page, "Chart.Series.Hardware.Color")).toContainText("Automatic");

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).seriesOptions.Services.color).toBe("#FF00AA");
    await expect.poll(async () => (await plot(pageChart(page))).legendColors[1]).toBe("rgb(255, 0, 170)");
  });

  test("Data Labels: show labels, number format, date format and text template", async ({ page, api }) => {
    await startLineChart(page);
    await editorTab(page, "DataLabels");
    const firstLabel = async () => (await plot(preview(page))).labels[0];
    await expect(byTest(page, "Chart.DataLabels.ShowDataLabels")).not.toBeChecked();
    expect((await plot(preview(page))).labels).toEqual([]);

    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await expect.poll(firstLabel).toBe("9,340.52000");
    expect((await plot(preview(page))).labels).toHaveLength(40);

    await setInput(page, "Chart.DataLabels.NumberFormat", "0,0.0");
    await expect.poll(firstLabel).toBe("9,340.5");

    // The X value is shown in the organization's date format until a format is given here
    await setInput(page, "Chart.DataLabels.TextFormat", "{{ @@x }} | {{ @@y }}");
    await expect.poll(firstLabel).toMatch(/^.*\d.* \| 9,340\.5$/);
    await setInput(page, "Chart.DataLabels.DateTimeFormat", "MMM YYYY");
    await expect.poll(firstLabel).toBe("Jan 2026 | 9,340.5");

    await setInput(page, "Chart.DataLabels.TextFormat", "{{ @@name }}: {{ @@y }}");
    await expect.poll(firstLabel).toBe("Hardware: 9,340.5");

    const saved = await saveVisualization(page);
    expect(await savedOptions(api, queries.monthly, saved.id)).toMatchObject({
      showDataLabels: true,
      numberFormat: "0,0.0",
      dateTimeFormat: "MMM YYYY",
      textFormat: "{{ @@name }}: {{ @@y }}",
    });
    await expect.poll(async () => (await plot(pageChart(page))).labels[0]).toBe("Hardware: 9,340.5");
    await expectPlot(pageChart(page), { traces: CATEGORIES.map((category) => `scatter/lines+text:${category}`) });
  });

  test("the editor is closed and nothing is created by Cancel on an untouched new chart", async ({ page, api }) => {
    await openQuery(page, queries.monthly);
    const before = (await api.get(`/api/queries/${queries.monthly}`)).visualizations.length;
    await newChart(page);
    await page.locator(".ant-modal-footer").getByRole("button", { name: "Cancel" }).click();
    await expect(editor(page)).toHaveCount(0);
    expect((await api.get(`/api/queries/${queries.monthly}`)).visualizations.length).toBe(before);
  });
});
