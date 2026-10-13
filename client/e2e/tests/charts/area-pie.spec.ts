import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
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
  overlaps,
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

/** `fill/stackgroup` of each trace. */
const fillModes = (page: Page) => readPlot(preview(page), (gd) => gd.data.map((d: any) => `${d.fill}`));

/** [left, top, right, bottom] of every pie drawn in the chart. */
const pieBoxes = (page: Page) =>
  preview(page)
    .locator("g.pielayer g.trace")
    .evaluateAll((pies) =>
      pies.map((pie) => {
        const b = pie.getBoundingClientRect();
        return [b.left, b.top, b.right, b.bottom].map(Math.round);
      })
    );

const sliceFills = (page: Page) =>
  preview(page)
    .locator("g.slice path.surface")
    .evaluateAll((paths) => paths.map((path) => (path as SVGElement).style.fill));

test.describe("Chart editor: area and pie charts", () => {
  let queries: { monthly: number; channel: number; catchan: number };

  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["monthly", "channel", "catchan"]);
  });
  test.afterAll(async ({ api }) => {
    await archiveQueries(api, queries);
  });

  async function startAreaChart(page: Page) {
    await openQuery(page, queries.monthly);
    await newChart(page, uniqueName("C area"));
    await chartType(page, "area");
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "revenue");
    await mapColumn(page, "series", "category");
    await expectPlot(preview(page), { legend: CATEGORIES, lines: 4, fills: 4 });
  }

  async function startPie(page: Page, queryId: number) {
    await openQuery(page, queryId);
    await newChart(page, uniqueName("C pie"));
    await chartType(page, "pie");
    await mapColumn(page, "x", "channel");
    await mapColumn(page, "y", "revenue");
  }

  test("Area chart: every group is a filled line down to zero", async ({ page, api }) => {
    await startAreaChart(page);
    await expectPlot(preview(page), { traces: CATEGORIES.map((category) => `scatter/lines:${category}`) });
    expect(await fillModes(page)).toEqual(["tozeroy", "tozeroy", "tozeroy", "tozeroy"]);
    // Not stacked: the axis ends just above the largest single value (19k)
    expect((await plot(preview(page))).yRange?.[1]).toBeLessThan(25_000);

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.monthly, saved.id)).globalSeriesType).toBe("area");
    await expectPlot(pageChart(page), { legend: CATEGORIES, lines: 4, fills: 4 });
  });

  test("Stacked area: fills on top of each other, percent mode 0-100, spline shape", async ({ page, api }) => {
    await startAreaChart(page);
    await choose(page, "Chart.Stacking", "Chart.Stacking.Stack");
    await expect.poll(() => fillModes(page)).toEqual(["tonexty", "tonexty", "tonexty", "tonexty"]);
    // Stacked: the months add up to 30k - 50k
    await expect.poll(async () => (await plot(preview(page))).yRange?.[1]).toBeGreaterThan(40_000);

    await byTest(page, "Chart.NormalizeValues").check();
    await expectPlot(preview(page), { yTicks: ["0", "20", "40", "60", "80", "100"] });
    const range = (await plot(preview(page))).yRange as number[];
    expect(range[0]).toBe(0);
    expect(range[1]).toBeGreaterThanOrEqual(100);
    expect(range[1]).toBeLessThan(110);

    await byTest(page, "Chart.NormalizeValues").uncheck();
    await choose(page, "Chart.LineShape", "Chart.LineShape.Spline");
    await expectPlot(preview(page), { lineShapes: ["spline"], fills: 4 });

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.monthly, saved.id);
    expect(options.series).toMatchObject({ stacking: "stack", percentValues: false });
    expect(options.lineShape).toBe("spline");
    await expectPlot(pageChart(page), { legend: CATEGORIES, fills: 4, lineShapes: ["spline"] });
  });

  test("Pie: a donut with percent labels, a title, direction and its own editor controls", async ({ page, api }) => {
    await startPie(page, queries.channel);
    await expectPlot(preview(page), {
      traces: ["pie:revenue"],
      slices: 3,
      // sorted by size
      legend: ["web", "partner", "direct"],
      labels: ["34.6%", "33.2%", "32.2%"],
      annotations: ["revenue"],
    });
    expect(await readPlot(preview(page), (gd) => gd.data[0].hole)).toBeGreaterThan(0);

    // Pie has a direction select and no line shape / stacking-only controls of the other types
    await expect(byTest(page, "Chart.LineShape")).toHaveCount(0);
    await expect(byTest(page, "Chart.SwappedAxes")).toHaveCount(0);
    await choose(page, "Chart.PieDirection", "Chart.PieDirection.Clockwise");
    await expect.poll(() => readPlot(preview(page), (gd) => gd.data[0].direction)).toBe("clockwise");

    // The series label is the title in the middle of the donut
    await editorTab(page, "Series");
    await expect(page.locator(".chart-editor-series thead th")).toHaveText(["Order", "Label"]);
    await setInput(page, "Chart.Series.revenue.Label", "Revenue share");
    await expectPlot(preview(page), { annotations: ["Revenue share"], traces: ["pie:Revenue share"] });

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.channel, saved.id);
    expect(options.globalSeriesType).toBe("pie");
    expect(options.direction).toEqual({ type: "clockwise" });
    expect(options.seriesOptions.revenue.name).toBe("Revenue share");
    await expectPlot(pageChart(page), {
      slices: 3,
      labels: ["34.6%", "33.2%", "32.2%"],
      annotations: ["Revenue share"],
    });
  });

  test("Pie colours: scheme, a preset and a custom hex per value", async ({ page, api }) => {
    await startPie(page, queries.channel);
    await expectPlot(preview(page), { slices: 3 });
    await editorTab(page, "Colors");
    // One row per value (not per series)
    for (const value of ["direct", "partner", "web"]) {
      await expect(byTest(page, `Chart.Series.${value}.Color`)).toContainText("Automatic");
    }

    await choose(page, "ColorScheme", "ColorOptionD3 Category 10");
    // legend order is web, partner, direct; colours are given in the order direct, partner, web
    await expectPlot(preview(page), { legendColors: ["rgb(44, 160, 44)", "rgb(255, 127, 14)", "rgb(31, 119, 180)"] });

    const picker = await openColorPicker(page, "Chart.Series.web.Color");
    await picker.locator(".color-picker-input-swatches > *").nth(4).click();
    await expect(picker.locator(".ant-card-head-title")).toHaveText("#9467BD");
    await closeColorPicker(page);

    await openColorPicker(page, "Chart.Series.direct.Color");
    await typeCustomColor(page, "222222");
    // web and direct have their own colours now; partner, still automatic, gets the first colour of the scheme
    await expect.poll(() => sliceFills(page)).toEqual(["rgb(148, 103, 189)", "rgb(31, 119, 180)", "rgb(34, 34, 34)"]);
    await closeColorPicker(page);

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.channel, saved.id);
    expect(options.color_scheme).toBe("D3 Category 10");
    expect(options.valuesOptions).toMatchObject({ web: { color: "#9467BD" }, direct: { color: "#222222" } });
    await expectPlot(pageChart(page), {
      legendColors: ["rgb(148, 103, 189)", "rgb(31, 119, 180)", "rgb(34, 34, 34)"],
    });
  });

  test("Pie data labels: on by default, can be switched off; the template changes the hover text only", async ({
    page,
    api,
  }) => {
    await startPie(page, queries.channel);
    await expectPlot(preview(page), { labels: ["34.6%", "33.2%", "32.2%"] });
    await editorTab(page, "DataLabels");
    await expect(byTest(page, "Chart.DataLabels.ShowDataLabels")).toBeChecked();

    // The labels on the slices stay Plotly's own percent; the template and the percent format are the hover text
    const hoverText = () => readPlot(preview(page), (gd) => [...gd.data[0].text].sort() as string[]);
    await setInput(page, "Chart.DataLabels.TextFormat", "{{ @@x }}: {{ @@yPercent }}");
    await expect.poll(hoverText).toEqual(["direct: 32.18%", "partner: 33.17%", "web: 34.65%"]);
    await setInput(page, "Chart.DataLabels.PercentFormat", "0.0%");
    await expect.poll(async () => (await hoverText()).slice(0, 2)).toEqual(["direct: 32.2%", "partner: 33.2%"]);
    await expectPlot(preview(page), { labels: ["34.6%", "33.2%", "32.2%"] });

    await byTest(page, "Chart.DataLabels.ShowDataLabels").uncheck();
    await expectPlot(preview(page), { labels: [], slices: 3 });
    await byTest(page, "Chart.DataLabels.ShowDataLabels").check();
    await expectPlot(preview(page), { labels: ["34.6%", "33.2%", "32.2%"] });

    const saved = await saveVisualization(page);
    expect(await savedOptions(api, queries.channel, saved.id)).toMatchObject({
      showDataLabels: true,
      percentFormat: "0.0%",
      textFormat: "{{ @@x }}: {{ @@yPercent }}",
    });
  });

  test("Group by draws one pie per group in a grid, each with its title, legend right or below", async ({
    page,
    api,
  }) => {
    await startPie(page, queries.catchan);
    await mapColumn(page, "series", "category");
    await expectPlot(preview(page), {
      traces: CATEGORIES.map((category) => `pie:${category}`),
      slices: 12,
      legend: ["direct", "web", "partner"],
      annotations: CATEGORIES,
    });

    // Four pies in a 2 x 2 grid that do not overlap each other or the legend
    const check = async () => {
      const boxes = await pieBoxes(page);
      expect(boxes).toHaveLength(4);
      expect(new Set(boxes.map((box) => box[0])).size).toBe(2);
      expect(new Set(boxes.map((box) => box[1])).size).toBe(2);
      const legendBox = (await plot(preview(page))).legendBox;
      for (const [index, box] of boxes.entries()) {
        expect(overlaps(box, legendBox), `pie ${index} and the legend overlap`).toBe(false);
        for (const other of boxes.slice(index + 1)) {
          expect(overlaps(box, other), "two pies overlap").toBe(false);
        }
      }
      return { boxes, legendBox };
    };
    await expect(check).toPass();

    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.Below");
    await expect(async () => {
      const { boxes, legendBox } = await check();
      expect(legendBox?.[1]).toBeGreaterThanOrEqual(Math.max(...boxes.map((box) => box[3])) - 1);
    }).toPass();

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.catchan, saved.id)).legend.placement).toBe("below");
    await expectPlot(pageChart(page), { slices: 12, annotations: CATEGORIES, legend: ["direct", "web", "partner"] });
  });

  test("two Y columns draw two pies", async ({ page, api }) => {
    await startPie(page, queries.channel);
    await mapColumn(page, "y", "orders");
    await expectPlot(preview(page), {
      traces: ["pie:revenue", "pie:orders"],
      slices: 6,
      legend: ["web", "partner", "direct"],
      labels: ["34.6%", "33.2%", "32.2%", "34.7%", "33.8%", "31.5%"],
      annotations: ["revenue", "orders"],
    });
    const boxes = await pieBoxes(page);
    expect(boxes).toHaveLength(2);
    expect(overlaps(boxes[0], boxes[1])).toBe(false);

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.channel, saved.id)).columnMapping).toEqual({
      channel: "x",
      revenue: "y",
      orders: "y",
    });
    await expectPlot(pageChart(page), { traces: ["pie:revenue", "pie:orders"], slices: 6 });
  });
});
