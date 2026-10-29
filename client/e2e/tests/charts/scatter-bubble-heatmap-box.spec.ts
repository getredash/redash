import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest } from "../../support/ui";
import {
  archiveQueries,
  chartType,
  choose,
  closeColorPicker,
  editorTab,
  expectPlot,
  mapColumn,
  newChart,
  openColorPicker,
  openQuery,
  pageChart,
  plot,
  preview,
  readPlot,
  savedOptions,
  saveVisualization,
  seedQueries,
  setInput,
  typeCustomColor,
} from "./helpers";

const CATEGORIES = ["Hardware", "Services", "Software", "Training"];
const CHANNELS = ["direct", "partner", "web"];

/** x, y, z and the colour scale of the heatmap trace. */
const heatmap = (page: Page) =>
  readPlot(preview(page), (gd) => {
    const d = gd.data[0];
    return { x: d.x, y: d.y, z: d.z, colorscale: d.colorscale as [number, string][] };
  });

/** Relative luminance (0 black .. 1 white) of a CSS colour. */
function luminance(color: string): number {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  const rgb = hex
    ? [0, 2, 4].map((i) => Number.parseInt(hex[1].slice(i, i + 2), 16))
    : (color.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test.describe("Chart editor: scatter, bubble, heatmap and box", () => {
  let queries: { points: number; bubble: number; catchan: number };

  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["points", "bubble", "catchan"]);
  });
  test.afterAll(async ({ api }) => {
    await archiveQueries(api, queries);
  });

  /** Heatmap with X = category, Y = channel (both text), colour = revenue. */
  async function startHeatmap(page: Page) {
    await openQuery(page, queries.catchan);
    await newChart(page, uniqueName("C heatmap"));
    await chartType(page, "heatmap");
    await mapColumn(page, "x", "category");
    await mapColumn(page, "y", "channel");
    await mapColumn(page, "zVal", "revenue");
    await expectPlot(preview(page), { traces: ["heatmap:"], xTicks: CATEGORIES });
  }

  async function yScaleCategory(page: Page) {
    await editorTab(page, "YAxis");
    await choose(page, "Chart.LeftYAxis.Type", "Chart.LeftYAxis.Type.Category");
    await expectPlot(preview(page), { yTicks: CHANNELS, heatmaps: 1 });
  }

  test("Scatter: one marker per row in a trace per group, on numeric axes with names", async ({ page, api }) => {
    await openQuery(page, queries.points);
    await newChart(page, uniqueName("C scatter"));
    await chartType(page, "scatter");
    await mapColumn(page, "x", "quantity");
    await mapColumn(page, "y", "amount");
    await mapColumn(page, "series", "category");
    // groups in the order of their first row
    const groups = ["Hardware", "Training", "Software", "Services"];
    await expectPlot(preview(page), {
      traces: groups.map((group) => `scatter/markers:${group}`),
      points: 300,
      lines: 0,
      legend: groups,
      xType: "linear",
      yType: "linear",
    });
    expect(await readPlot(preview(page), (gd) => gd.data.map((d: any) => d.x.length))).toEqual([89, 66, 71, 74]);

    await editorTab(page, "XAxis");
    await setInput(page, "Chart.XAxis.Name", "Quantity");
    await editorTab(page, "YAxis");
    await setInput(page, "Chart.LeftYAxis.Name", "Amount");
    await expectPlot(preview(page), { xTitle: "Quantity", yTitle: "Amount" });

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.points, saved.id)).globalSeriesType).toBe("scatter");
    await expectPlot(pageChart(page), { points: 300, legend: groups, xTitle: "Quantity", yTitle: "Amount" });
  });

  test("Bubble: the size column sets the marker size; coefficient and size mode scale it", async ({ page, api }) => {
    await openQuery(page, queries.bubble);
    await newChart(page, uniqueName("C bubble"));
    await chartType(page, "bubble");
    await mapColumn(page, "x", "avg_qty");
    await mapColumn(page, "y", "avg_amount");
    await mapColumn(page, "size", "orders");
    await mapColumn(page, "series", "category");
    await expectPlot(preview(page), {
      traces: CATEGORIES.map((category) => `scatter/markers:${category}`),
      points: 48,
      legend: CATEGORIES,
    });

    const sizes = () => readPlot(preview(page), (gd) => gd.data[0].marker.size.slice(0, 3) as number[]);
    const sizeMode = () => readPlot(preview(page), (gd) => gd.data[0].marker.sizemode as string);
    const widths = () =>
      preview(page)
        .locator("g.points path.point")
        .evaluateAll((points) => points.slice(0, 3).map((point) => Math.round(point.getBoundingClientRect().width)));

    // The marker size is the number of orders, in pixels
    await expect.poll(sizes).toEqual([14, 20, 15]);
    expect(await sizeMode()).toBe("diameter");
    expect(await widths()).toEqual([14, 20, 15]);

    await setInput(page, "Chart.BubbleCoefficient", "3");
    await expect.poll(sizes).toEqual([42, 60, 45]);
    await expect.poll(widths).toEqual([42, 60, 45]);

    await choose(page, "Chart.SizeMode", "Chart.SizeMode.Area");
    await expect.poll(sizeMode).toBe("area");
    // In area mode the same numbers are an area, so the markers are much smaller
    await expect.poll(async () => (await widths())[1]).toBeLessThan(20);
    await choose(page, "Chart.SizeMode", "Chart.SizeMode.Diameter");
    await expect.poll(widths).toEqual([42, 60, 45]);

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.bubble, saved.id);
    expect(options.globalSeriesType).toBe("bubble");
    expect(options.columnMapping).toMatchObject({ orders: "size" });
    expect(options.coefficient).toBe(3);
    expect(options.sizemode).toBe("diameter");
    await expectPlot(pageChart(page), { points: 48, legend: CATEGORIES });
  });

  test("Heatmap with the Y scale set to Category: cells, colour bar, reversed axes and data labels", async ({
    page,
    api,
  }) => {
    await startHeatmap(page);
    await yScaleCategory(page);
    const drawn = await heatmap(page);
    expect(drawn.x).toEqual(CATEGORIES);
    expect(drawn.y).toEqual(CHANNELS);
    expect(drawn.z).toEqual([
      [35405.98, 37070.42, 29212.55, 16993.63],
      [31536.58, 31590.93, 36242.45, 22961.08],
      [33728.49, 34187.09, 20839.19, 39025.25],
    ]);
    await expect(preview(page).locator(".colorbar")).toHaveCount(1);
    // The image fills the plot area
    const image = await preview(page).locator("g.hm image").boundingBox();
    const area = (await plot(preview(page))).plotBox as number[];
    expect(image?.width).toBeGreaterThan((area[2] - area[0]) * 0.95);
    expect(image?.height).toBeGreaterThan((area[3] - area[1]) * 0.95);

    await byTest(page, "Chart.LeftYAxis.Reverse").click();
    await expect.poll(async () => (await heatmap(page)).y).toEqual([...CHANNELS].reverse());
    await byTest(page, "Chart.LeftYAxis.Reverse").click();
    await expect.poll(async () => (await heatmap(page)).y).toEqual(CHANNELS);
    await editorTab(page, "XAxis");
    await byTest(page, "Chart.XAxis.Reverse").click();
    await expect.poll(async () => (await heatmap(page)).x).toEqual([...CATEGORIES].reverse());
    await byTest(page, "Chart.XAxis.Reverse").click();
    await expect.poll(async () => (await heatmap(page)).x).toEqual(CATEGORIES);

    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await setInput(page, "Chart.DataLabels.NumberFormat", "0,0");
    const cellLabels = () => preview(page).locator("g.scatterlayer g.textpoint text").allTextContents();
    await expect.poll(async () => (await cellLabels()).slice(0, 4)).toEqual(["35,406", "37,070", "29,213", "16,994"]);
    expect(await cellLabels()).toHaveLength(12);

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.catchan, saved.id);
    expect(options.globalSeriesType).toBe("heatmap");
    expect(options.columnMapping).toEqual({ category: "x", channel: "y", revenue: "zVal" });
    expect(options.yAxis[0].type).toBe("category");
    await expectPlot(pageChart(page), { heatmaps: 1, xTicks: CATEGORIES, yTicks: CHANNELS });
  });

  test("Heatmap colour schemes: named schemes and Custom with min and max colour pickers", async ({ page, api }) => {
    await startHeatmap(page);
    await yScaleCategory(page);
    await editorTab(page, "Colors");

    await choose(page, "Chart.Colors.Heatmap.ColorScheme", "Chart.Colors.Heatmap.ColorScheme.Viridis");
    await expect.poll(async () => (await heatmap(page)).colorscale[0]).toEqual([0, "#440154"]);
    await choose(page, "Chart.Colors.Heatmap.ColorScheme", "Chart.Colors.Heatmap.ColorScheme.YlOrRd");
    await expect.poll(async () => (await heatmap(page)).colorscale[0]).toEqual([0, "rgb(128,0,38)"]);

    // Custom: the minimum colour typed as hex, the maximum picked from the presets
    await expect(byTest(page, "Chart.Colors.Heatmap.MinColor")).toHaveCount(0);
    await choose(page, "Chart.Colors.Heatmap.ColorScheme", "Chart.Colors.Heatmap.ColorScheme.Custom...");
    await openColorPicker(page, "Chart.Colors.Heatmap.MinColor");
    await typeCustomColor(page, "FFFFCC");
    await expect.poll(async () => (await heatmap(page)).colorscale[0]).toEqual([0, "#FFFFCC"]);
    await closeColorPicker(page);
    const picker = await openColorPicker(page, "Chart.Colors.Heatmap.MaxColor");
    await picker.locator(".color-picker-input-swatches > *").nth(1).click();
    await closeColorPicker(page);
    await expect
      .poll(async () => (await heatmap(page)).colorscale)
      .toEqual([
        [0, "#FFFFCC"],
        [1, "#E92828"],
      ]);

    const saved = await saveVisualization(page);
    expect(await savedOptions(api, queries.catchan, saved.id)).toMatchObject({
      colorScheme: "Custom...",
      heatMinColor: "#FFFFCC",
      heatMaxColor: "#E92828",
    });
    await expect
      .poll(() => readPlot(pageChart(page), (gd) => gd.data[0].colorscale))
      .toEqual([
        [0, "#FFFFCC"],
        [1, "#E92828"],
      ]);
  });

  test("Heatmap with a text Y column draws its cells with the default Y scale", async ({ page }) => {
    knownIssue("heatmap-text-y-empty");
    await startHeatmap(page);
    // X auto-detects the text values; Y defaults to Linear and the plot stays empty (console: <image> height "NaN")
    const drawn = await plot(preview(page));
    expect(drawn.yTicks).toEqual(CHANNELS);
    const image = await preview(page).locator("g.hm image").boundingBox();
    expect(image?.height).toBeGreaterThan(100);
  });

  test("Heatmap data labels are light on the darkest cell", async ({ page }) => {
    knownIssue("heatmap-label-contrast");
    await startHeatmap(page);
    await yScaleCategory(page);
    await editorTab(page, "Colors");
    await choose(page, "Chart.Colors.Heatmap.ColorScheme", "Chart.Colors.Heatmap.ColorScheme.YlOrRd");
    await editorTab(page, "DataLabels");
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await setInput(page, "Chart.DataLabels.NumberFormat", "0,0");
    const label = preview(page).locator("g.scatterlayer g.textpoint text", { hasText: /^16,994$/ });
    await expect(label).toHaveCount(1);
    // The lowest value gets the dark end of the scale, rgb(128, 0, 38)
    expect((await heatmap(page)).colorscale[0]).toEqual([0, "rgb(128,0,38)"]);
    const fill = await label.evaluate((text) => getComputedStyle(text).fill);
    expect(luminance(fill), `label colour ${fill} on rgb(128, 0, 38)`).toBeGreaterThan(0.5);
  });

  test("Box: one box per category, all points, horizontal, a second Y column", async ({ page, api }) => {
    await openQuery(page, queries.points);
    await newChart(page, uniqueName("C box"));
    await chartType(page, "box");
    await mapColumn(page, "x", "category");
    await mapColumn(page, "y", "amount");
    await expectPlot(preview(page), {
      traces: ["box/markers:amount"],
      boxes: 4,
      legend: ["amount"],
      xTicks: CATEGORIES,
    });
    // Without "show all points" only the outliers are drawn as points
    expect((await plot(preview(page))).points).toBeLessThan(20);

    await byTest(page, "Chart.ShowPoints").check();
    await expectPlot(preview(page), { boxes: 4, points: 300 });
    expect(await readPlot(preview(page), (gd) => gd.data[0].boxpoints)).toBe("all");

    await byTest(page, "Chart.SwappedAxes").check();
    await expectPlot(preview(page), { traces: ["box/markers/h:amount"], yTicks: CATEGORIES });
    await expect(byTest(page, "VisualizationEditor.Tabs.XAxis")).toHaveText("Y Axis");
    await byTest(page, "Chart.SwappedAxes").uncheck();
    await expectPlot(preview(page), { traces: ["box/markers:amount"], xTicks: CATEGORIES });

    await mapColumn(page, "y", "quantity");
    await expectPlot(preview(page), {
      traces: ["box/markers:quantity", "box/markers:amount"],
      boxes: 8,
      points: 600,
      legend: ["quantity", "amount"],
    });

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.points, saved.id);
    expect(options.globalSeriesType).toBe("box");
    expect(options.showpoints).toBe(true);
    expect(options.swappedAxes).toBe(false);
    await expectPlot(pageChart(page), { boxes: 8, points: 600, legend: ["quantity", "amount"] });
  });
});
