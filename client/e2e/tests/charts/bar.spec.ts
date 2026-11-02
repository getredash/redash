import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest } from "../../support/ui";
import {
  archiveQueries,
  choose,
  editor,
  editorTab,
  expectPlot,
  mapColumn,
  newChart,
  openQuery,
  pageChart,
  plot,
  preview,
  readPlot,
  savedOptions,
  saveVisualization,
  seedQueries,
  setInput,
} from "./helpers";

const CATEGORIES = ["Hardware", "Services", "Software", "Training"];
const CHANNELS = ["direct", "partner", "web"];
const BAR_TRACES = CHANNELS.map((channel) => `bar:${channel}`);

test.describe("Chart editor: bar charts on a category axis", () => {
  let queries: { catchan: number; unsorted: number };

  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["catchan", "unsorted"]);
  });
  test.afterAll(async ({ api }) => {
    await archiveQueries(api, queries);
  });

  /** New Visualization (Bar is the default type), X = category, Y = revenue, group by channel. */
  async function startBarChart(page: Page) {
    await openQuery(page, queries.catchan);
    await newChart(page, uniqueName("C bar"));
    await expect(byTest(page, "Chart.GlobalSeriesType")).toContainText("Bar");
    await mapColumn(page, "x", "category");
    await mapColumn(page, "y", "revenue");
    await mapColumn(page, "series", "channel");
    await expectPlot(preview(page), { traces: BAR_TRACES, bars: 12, legend: CHANNELS, xTicks: CATEGORIES });
  }

  /** Saves and checks that the query page draws the same chart as the preview did. */
  async function saveAndCompare(page: Page) {
    const before = await plot(preview(page));
    const saved = await saveVisualization(page);
    await expectPlot(pageChart(page), {
      traces: before.traces,
      bars: before.bars,
      legend: before.legend,
      legendColors: before.legendColors,
      labels: before.labels,
      barmode: before.barmode,
      barnorm: before.barnorm,
    });
    return saved;
  }

  test("grouped bars: one bar per group and category, saved identical to the preview", async ({ page, api }) => {
    await startBarChart(page);
    await expectPlot(preview(page), {
      xType: "category",
      barmode: null, // Plotly's default: side by side
      legendColors: ["rgb(53, 106, 255)", "rgb(233, 40, 40)", "rgb(59, 217, 115)"],
    });
    // Grouped: the largest single value is 37,070, so the axis ends near 40k
    expect((await plot(preview(page))).yRange?.[1]).toBeLessThan(45_000);

    const saved = await saveAndCompare(page);
    const options = await savedOptions(api, queries.catchan, saved.id);
    expect(options.globalSeriesType).toBe("column");
    expect(options.columnMapping).toEqual({ category: "x", revenue: "y", channel: "series" });
    expect(options.series.stacking).toBeNull();
  });

  test("Stacking = Stack puts the groups on top of each other", async ({ page, api }) => {
    await startBarChart(page);
    await expect(byTest(page, "Chart.Stacking")).toContainText("Disabled");
    await choose(page, "Chart.Stacking", "Chart.Stacking.Stack");
    await expectPlot(preview(page), { barmode: "relative", bars: 12 });
    // Hardware in total is about 100.6k
    await expect.poll(async () => (await plot(preview(page))).yRange?.[1]).toBeGreaterThan(100_000);
    expect((await plot(preview(page))).yTicks).toEqual(["0", "20k", "40k", "60k", "80k", "100k"]);

    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await setInput(page, "Chart.DataLabels.NumberFormat", "0,0");
    await expect
      .poll(async () => (await plot(preview(page))).labels.slice(0, 4))
      .toEqual(["35,406", "37,070", "29,213", "16,994"]);

    const saved = await saveAndCompare(page);
    expect((await savedOptions(api, queries.catchan, saved.id)).series.stacking).toBe("stack");
  });

  test("Normalize values to percentage fills every bar to 100 and labels show the percent format", async ({
    page,
    api,
  }) => {
    await startBarChart(page);
    await choose(page, "Chart.Stacking", "Chart.Stacking.Stack");
    await byTest(page, "Chart.NormalizeValues").check();
    await expectPlot(preview(page), { barmode: "relative", yTicks: ["0", "20", "40", "60", "80", "100"] });
    // Every stack adds up to 100
    const totals = await readPlot(preview(page), (gd) =>
      gd.data[0].y.map((_: number, i: number) => Math.round(gd.data.reduce((sum: number, d: any) => sum + d.y[i], 0)))
    );
    expect(totals).toEqual([100, 100, 100, 100]);

    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await setInput(page, "Chart.DataLabels.PercentFormat", "0.0%");
    await expect
      .poll(async () => (await plot(preview(page))).labels.slice(0, 4))
      .toEqual(["35.2% (35,405.98000)", "36.0% (37,070.42000)", "33.9% (29,212.55000)", "21.5% (16,993.63000)"]);

    const saved = await saveAndCompare(page);
    const options = await savedOptions(api, queries.catchan, saved.id);
    expect(options.series).toMatchObject({ stacking: "stack", percentValues: true });
    expect(options.percentFormat).toBe("0.0%");
  });

  test("Horizontal Chart swaps the axes in the chart and in the editor", async ({ page, api }) => {
    await startBarChart(page);
    await expect(editor(page).getByText("X Column", { exact: true })).toBeVisible();
    await expect(byTest(page, "VisualizationEditor.Tabs.XAxis")).toHaveText("X Axis");

    await byTest(page, "Chart.SwappedAxes").check();
    await expectPlot(preview(page), {
      traces: CHANNELS.map((channel) => `bar/h:${channel}`),
      bars: 12,
      yTicks: CATEGORIES,
    });
    expect((await plot(preview(page))).xTicks[0]).toBe("0");
    // Bars are wider than tall
    const bar = await preview(page).locator("g.barlayer g.point path").first().boundingBox();
    expect(bar?.width).toBeGreaterThan(bar?.height ?? 0);

    // The editor follows: mapping labels and tab titles swap, the Series tab loses its Y Axis column
    await expect(editor(page).getByText("Y Column", { exact: true })).toBeVisible();
    await expect(editor(page).getByText("X Columns", { exact: true })).toBeVisible();
    await expect(byTest(page, "VisualizationEditor.Tabs.XAxis")).toHaveText("Y Axis");
    await expect(byTest(page, "VisualizationEditor.Tabs.YAxis")).toHaveText("X Axis");
    await editorTab(page, "Series");
    await expect(page.locator(".chart-editor-series thead th")).toHaveText(["Order", "Label", "Type"]);

    // The name of the value axis lands on the horizontal axis
    await editorTab(page, "YAxis");
    await setInput(page, "Chart.LeftYAxis.Name", "Revenue (horizontal)");
    await expectPlot(preview(page), { xTitle: "Revenue (horizontal)", yTitle: null });

    await editorTab(page, "General");
    await choose(page, "Chart.Stacking", "Chart.Stacking.Stack");
    await expectPlot(preview(page), { barmode: "relative" });

    const saved = await saveAndCompare(page);
    const options = await savedOptions(api, queries.catchan, saved.id);
    expect(options.swappedAxes).toBe(true);
    expect(options.series.stacking).toBe("stack");
    await expectPlot(pageChart(page), { yTicks: CATEGORIES, xTitle: "Revenue (horizontal)" });
  });

  test("X axis Reverse Order flips a Category axis and does nothing on Auto Detect", async ({ page, api }) => {
    await startBarChart(page);
    await editorTab(page, "XAxis");
    await expect(byTest(page, "Chart.XAxis.Type")).toContainText("Auto Detect");

    // With Auto Detect the switch has no effect, even though a category axis was detected
    await byTest(page, "Chart.XAxis.Reverse").click();
    await expect(byTest(page, "Chart.XAxis.Reverse")).toHaveAttribute("aria-checked", "true");
    await expectPlot(preview(page), { xType: "category", xTicks: CATEGORIES });

    await choose(page, "Chart.XAxis.Type", "Chart.XAxis.Type.Category");
    await expectPlot(preview(page), { xTicks: [...CATEGORIES].reverse() });
    await byTest(page, "Chart.XAxis.Reverse").click();
    await expectPlot(preview(page), { xTicks: CATEGORIES });

    await byTest(page, "Chart.XAxis.Reverse").click();
    const saved = await saveVisualization(page);
    expect(await savedOptions(api, queries.catchan, saved.id)).toMatchObject({
      reverseX: true,
      xAxis: { type: "category" },
    });
    await expectPlot(pageChart(page), { xTicks: [...CATEGORIES].reverse() });
  });

  test("X axis Sort Values orders the categories; switched off they keep the order of the result", async ({
    page,
    api,
  }) => {
    // The result rows come as cherry, apple, banana
    await openQuery(page, queries.unsorted);
    await newChart(page, uniqueName("C bar sort"));
    await mapColumn(page, "x", "fruit");
    await mapColumn(page, "y", "amount");
    await expectPlot(preview(page), { xTicks: ["apple", "banana", "cherry"] });

    await editorTab(page, "XAxis");
    await expect(byTest(page, "Chart.XAxis.Sort")).toHaveAttribute("aria-checked", "true");
    await byTest(page, "Chart.XAxis.Sort").click();
    await expectPlot(preview(page), { xTicks: ["cherry", "apple", "banana"] });

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.unsorted, saved.id)).sortX).toBe(false);
    await expectPlot(pageChart(page), { xTicks: ["cherry", "apple", "banana"] });
  });

  test("axis names, Show Labels and a Y axis tick format on a bar chart", async ({ page, api }) => {
    await startBarChart(page);
    await editorTab(page, "XAxis");
    await setInput(page, "Chart.XAxis.Name", "Category");
    await byTest(page, "Chart.XAxis.ShowLabels").click();
    await expectPlot(preview(page), { xTicks: [], xTitle: "Category" });
    await byTest(page, "Chart.XAxis.ShowLabels").click();
    await expectPlot(preview(page), { xTicks: CATEGORIES });

    await editorTab(page, "YAxis");
    await setInput(page, "Chart.LeftYAxis.Name", "Revenue");
    await expectPlot(preview(page), { yTicks: ["0", "5k", "10k", "15k", "20k", "25k", "30k", "35k", "40k"] });
    await setInput(page, "Chart.LeftYAxis.TickFormat", ",.0f");
    await expectPlot(preview(page), {
      xTitle: "Category",
      yTitle: "Revenue",
      yTicks: ["0", "5,000", "10,000", "15,000", "20,000", "25,000", "30,000", "35,000", "40,000"],
    });

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.catchan, saved.id)).yAxis[0]).toMatchObject({
      title: { text: "Revenue" },
      tickFormat: ",.0f",
    });
    await expectPlot(pageChart(page), { xTitle: "Category", yTitle: "Revenue" });
    expect((await plot(pageChart(page))).yTicks).toContain("10,000");
  });

  test("Data Labels number format on bars: abbreviated values", async ({ page, api }) => {
    await startBarChart(page);
    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await expect.poll(async () => (await plot(preview(page))).labels[0]).toBe("35,405.98000");
    await setInput(page, "Chart.DataLabels.NumberFormat", "0.0a");
    await expect
      .poll(async () => (await plot(preview(page))).labels)
      .toEqual([
        "35.4k",
        "37.1k",
        "29.2k",
        "17.0k",
        "31.5k",
        "31.6k",
        "36.2k",
        "23.0k",
        "33.7k",
        "34.2k",
        "20.8k",
        "39.0k",
      ]);
    await setInput(page, "Chart.DataLabels.TextFormat", "{{ @@name }}: {{ @@y }}");
    await expect.poll(async () => (await plot(preview(page))).labels[0]).toBe("direct: 35.4k");

    const saved = await saveAndCompare(page);
    expect(await savedOptions(api, queries.catchan, saved.id)).toMatchObject({
      showDataLabels: true,
      numberFormat: "0.0a",
      textFormat: "{{ @@name }}: {{ @@y }}",
    });
  });
});
