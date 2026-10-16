import fs from "fs";
import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { createVisualizationViaApi, drag } from "../../support/ui";
import {
  archiveQueries,
  expectPlot,
  hoverTexts,
  legendItem,
  modebarClick,
  overlaps,
  pageChart,
  plot,
  plotArea,
  pointPosition,
  readPlot,
  seedQueries,
  settledBox,
  settledCenter,
  visibility,
} from "./helpers";

const CATEGORIES = ["Hardware", "Services", "Software", "Training"];

/** Axis ranges and modes as Plotly holds them. */
const axes = (chart: Locator) =>
  readPlot(chart, (gd) => {
    const layout = gd._fullLayout;
    return {
      x: layout.xaxis.range.map(String) as string[],
      y: layout.yaxis.range.map((v: number) => Math.round(v)) as number[],
      dragmode: layout.dragmode as string,
      hovermode: layout.hovermode as string,
    };
  });

/** Milliseconds of an axis range value like "2026-03-17 19:22:14.8315". */
const time = (value: string) => new Date(value.replace(" ", "T")).getTime();

test.describe("Chart interactions with the mouse", () => {
  let queries: { monthly: number; channel: number; catchan: number };
  let charts: { line: number; pie: number; stacked: number; heatmap: number };

  // These charts are only looked at and clicked on, so they are prepared through the API
  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["monthly", "channel", "catchan"]);
    charts = {
      line: await createVisualizationViaApi(api, queries.monthly, {
        type: "CHART",
        name: uniqueName("C interact line"),
        options: {
          globalSeriesType: "line",
          columnMapping: { month: "x", revenue: "y", category: "series" },
        },
      }),
      pie: await createVisualizationViaApi(api, queries.channel, {
        type: "CHART",
        name: uniqueName("C interact pie"),
        options: {
          globalSeriesType: "pie",
          columnMapping: { channel: "x", revenue: "y" },
          showDataLabels: true,
          percentFormat: "0.0%",
          textFormat: "{{ @@x }}: {{ @@yPercent }}",
        },
      }),
      stacked: await createVisualizationViaApi(api, queries.catchan, {
        type: "CHART",
        name: uniqueName("C interact stacked"),
        options: {
          globalSeriesType: "column",
          columnMapping: { category: "x", revenue: "y", channel: "series" },
          series: { stacking: "stack", percentValues: false },
          numberFormat: "0,0",
        },
      }),
      heatmap: await createVisualizationViaApi(api, queries.catchan, {
        type: "CHART",
        name: uniqueName("C interact heatmap"),
        options: {
          globalSeriesType: "heatmap",
          columnMapping: { category: "x", channel: "y", revenue: "zVal" },
          yAxis: [{ type: "category" }, { type: "linear", opposite: true }],
        },
      }),
    };
  });
  test.afterAll(async ({ api }) => {
    await archiveQueries(api, queries);
  });

  /** Opens the query's view page on the chart's tab. */
  async function openChart(page: Page, queryId: number, visualizationId: number) {
    await page.goto(`/queries/${queryId}#${visualizationId}`);
    await expect(pageChart(page)).toBeVisible({ timeout: 30_000 });
    return pageChart(page);
  }

  async function openLine(page: Page) {
    const chart = await openChart(page, queries.monthly, charts.line);
    await expectPlot(chart, { lines: 4, legend: CATEGORIES });
    return chart;
  }

  test("hovering a point of a line chart shows a tooltip per series and the date on the axis", async ({ page }) => {
    const chart = await openLine(page);
    const may = await pointPosition(chart, 0, 4);
    await page.mouse.move(may.x - 80, may.y + 40);
    await page.mouse.move(may.x, may.y, { steps: 15 });
    await expect
      .poll(async () => (await hoverTexts(chart)).sort())
      .toEqual(
        [
          "May 1, 2026",
          "Hardware18,077.77000",
          "Services14,239.76000",
          "Software10,883.22000",
          "Training8,795.01000",
        ].sort()
      );

    const january = await pointPosition(chart, 1, 0);
    await page.mouse.move(january.x, january.y, { steps: 15 });
    await expect.poll(() => hoverTexts(chart)).toContain("Services15,916.95000");
    expect(await hoverTexts(chart)).toContain("Jan 1, 2026");

    // Leaving the plot removes the tooltip
    const area = await plotArea(chart);
    await page.mouse.move(area.x + area.width / 2, area.y - 60, { steps: 10 });
    await expect.poll(() => hoverTexts(chart)).toEqual([]);
  });

  test("hovering a stacked bar shows the values of the whole stack", async ({ page }) => {
    const chart = await openChart(page, queries.catchan, charts.stacked);
    await expectPlot(chart, { bars: 12, barmode: "relative" });
    // partner / Software
    const bar = await settledCenter(chart.locator("g.barlayer g.trace").nth(1).locator("g.point path").nth(2));
    await page.mouse.move(bar.x, bar.y, { steps: 15 });
    await expect
      .poll(async () => (await hoverTexts(chart)).sort())
      .toEqual(["Software", "direct29,213", "partner36,242", "web20,839"]);
  });

  test("hovering a pie slice shows its label and percent", async ({ page }) => {
    const chart = await openChart(page, queries.channel, charts.pie);
    await expectPlot(chart, { slices: 3 });
    // The web slice is the largest; its label sits inside it
    const label = await settledBox(chart.locator("g.slicetext text", { hasText: "34.6%" }));
    await page.mouse.move(label.x + label.width / 2, label.y + label.height + 6, { steps: 15 });
    await expect.poll(() => hoverTexts(chart)).toEqual(["web: 34.6%"]);
  });

  test("hovering a heatmap cell shows x, y and z", async ({ page }) => {
    const chart = await openChart(page, queries.catchan, charts.heatmap);
    await expectPlot(chart, { heatmaps: 1, yTicks: ["direct", "partner", "web"] });
    const area = await plotArea(chart);
    // third of four columns, middle of three rows
    await page.mouse.move(area.x + area.width * 0.62, area.y + area.height * 0.5, { steps: 15 });
    await expect.poll(() => hoverTexts(chart)).toEqual(["x: Softwarey: partnerz: 36.24245k"]);
  });

  test("a click on a legend item hides the series and a second click shows it again", async ({ page }) => {
    const chart = await openLine(page);
    const services = await legendItem(chart, "Services");
    await page.mouse.click(services.x, services.y);
    await expect
      .poll(() => visibility(chart))
      .toEqual(["Hardware:true", "Services:legendonly", "Software:true", "Training:true"]);
    await expectPlot(chart, { lines: 3, legend: CATEGORIES });
    // The hidden item is greyed out in the legend
    const opacity = (name: string) =>
      chart
        .locator("g.legend g.traces")
        .filter({ hasText: name })
        .evaluate((item) => Number(getComputedStyle(item).opacity));
    expect(await opacity("Services")).toBeLessThan(1);
    expect(await opacity("Hardware")).toBe(1);

    await page.mouse.click(services.x, services.y);
    await expect
      .poll(() => visibility(chart))
      .toEqual(["Hardware:true", "Services:true", "Software:true", "Training:true"]);
    await expectPlot(chart, { lines: 4 });
  });

  test("hiding a pie slice from the legend recomputes the other percentages", async ({ page }) => {
    const chart = await openChart(page, queries.channel, charts.pie);
    await expectPlot(chart, { labels: ["34.6%", "33.2%", "32.2%"] });
    const partner = await legendItem(chart, "partner");
    await page.mouse.click(partner.x, partner.y);
    await expectPlot(chart, { labels: ["51.8%", "48.2%"], legend: ["web", "partner", "direct"] });
    await page.mouse.click(partner.x, partner.y);
    await expectPlot(chart, { labels: ["34.6%", "33.2%", "32.2%"] });
  });

  test("hiding a series of a stacked bar chart re-flows the stack", async ({ page }) => {
    const chart = await openChart(page, queries.catchan, charts.stacked);
    await expectPlot(chart, { bars: 12, yTicks: ["0", "20k", "40k", "60k", "80k", "100k"] });
    const direct = await legendItem(chart, "direct");
    await page.mouse.click(direct.x, direct.y);
    await expect.poll(() => visibility(chart)).toEqual(["direct:legendonly", "partner:true", "web:true"]);
    // The remaining two series start at zero again: the axis now ends above 60k instead of 100k
    await expectPlot(chart, { bars: 8, yTicks: ["0", "10k", "20k", "30k", "40k", "50k", "60k"] });
    const lowest = await chart.locator("g.barlayer g.trace").first().locator("g.point path").first().boundingBox();
    const area = await plotArea(chart);
    expect(Math.abs((lowest?.y ?? 0) + (lowest?.height ?? 0) - (area.y + area.height))).toBeLessThan(3);
  });

  test("a double-click on a legend item isolates the series; again brings all back", async ({ page }) => {
    const chart = await openLine(page);
    const software = await legendItem(chart, "Software");
    await page.mouse.dblclick(software.x, software.y);
    await expect
      .poll(() => visibility(chart))
      .toEqual(["Hardware:legendonly", "Services:legendonly", "Software:true", "Training:legendonly"]);
    await expectPlot(chart, { lines: 1 });

    await page.mouse.dblclick(software.x, software.y);
    await expect
      .poll(() => visibility(chart))
      .toEqual(["Hardware:true", "Services:true", "Software:true", "Training:true"]);
    await expectPlot(chart, { lines: 4 });
  });

  test("dragging across the plot zooms into the region and a double-click resets it", async ({ page }) => {
    const chart = await openLine(page);
    const area = await plotArea(chart);
    const before = await axes(chart);
    expect(before.dragmode).toBe("zoom");

    const from = { x: area.x + area.width * 0.3, y: area.y + area.height * 0.25 };
    const to = { x: area.x + area.width * 0.6, y: area.y + area.height * 0.7 };
    await page.mouse.move(from.x, from.y, { steps: 5 });
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 20 });
    // Mid-drag the zoom box is drawn
    await expect(chart.locator(".zoomlayer path.zoombox")).toHaveCount(1);
    await page.mouse.up();

    // The new ranges are the dragged region: 30%..60% of the X range, 30%..75% of the Y range (from the bottom)
    const spanX = time(before.x[1]) - time(before.x[0]);
    const spanY = before.y[1] - before.y[0];
    await expect(async () => {
      const zoomed = await axes(chart);
      expect(Math.abs(time(zoomed.x[0]) - (time(before.x[0]) + spanX * 0.3))).toBeLessThan(spanX * 0.01);
      expect(Math.abs(time(zoomed.x[1]) - (time(before.x[0]) + spanX * 0.6))).toBeLessThan(spanX * 0.01);
      expect(Math.abs(zoomed.y[0] - (before.y[0] + spanY * 0.3))).toBeLessThan(spanY * 0.01);
      expect(Math.abs(zoomed.y[1] - (before.y[0] + spanY * 0.75))).toBeLessThan(spanY * 0.01);
    }).toPass();

    await page.mouse.dblclick(area.x + area.width / 2, area.y + area.height / 2);
    await expect.poll(() => axes(chart)).toEqual(before);
  });

  test("the mode bar has the standard buttons and no cloud, upload or Plotly logo button", async ({ page }) => {
    const chart = await openLine(page);
    const area = await plotArea(chart);
    await page.mouse.move(area.x + area.width / 2, area.y + 30, { steps: 5 });
    await expect(chart.locator(".modebar-btn").first()).toBeVisible();
    expect((await plot(chart)).modebar).toEqual([
      "Download plot as a PNG",
      "Zoom",
      "Pan",
      "Zoom in",
      "Zoom out",
      "Autoscale",
      "Reset axes",
      "Toggle Spike Lines",
      "Show closest data on hover",
      "Compare data on hover",
      "Toggle rangeslider",
    ]);
    await expect(
      chart.locator(".modebar-btn.plotlyjsicon, .modebar a[href*='plotly'], .modebar a[href*='chart-studio']")
    ).toHaveCount(0);
  });

  test("mode bar: Pan, Zoom in, Zoom out, Autoscale, Reset axes and Zoom", async ({ page }) => {
    const chart = await openLine(page);
    const area = await plotArea(chart);
    const original = await axes(chart);
    const spanX = time(original.x[1]) - time(original.x[0]);

    await modebarClick(chart, "Pan");
    await expect.poll(async () => (await axes(chart)).dragmode).toBe("pan");
    // Dragging the plot a quarter of its width to the left shifts the X range a quarter to the right
    const y = area.y + area.height / 2;
    await drag(page, { x: area.x + area.width * 0.6, y }, { x: area.x + area.width * 0.35, y });
    await expect(async () => {
      const panned = await axes(chart);
      expect(Math.abs(time(panned.x[0]) - time(original.x[0]) - spanX * 0.25)).toBeLessThan(spanX * 0.01);
      expect(Math.abs(time(panned.x[1]) - time(panned.x[0]) - spanX)).toBeLessThan(spanX * 0.001);
      expect(panned.y).toEqual(original.y);
    }).toPass();
    const panned = await axes(chart);

    await modebarClick(chart, "Zoom in");
    await expect(async () => {
      const zoomedIn = await axes(chart);
      // half the span around the same centre
      expect(Math.abs(time(zoomedIn.x[1]) - time(zoomedIn.x[0]) - spanX / 2)).toBeLessThan(spanX * 0.01);
    }).toPass();
    await modebarClick(chart, "Zoom out");
    await expect.poll(() => axes(chart)).toEqual(panned);

    await modebarClick(chart, "Autoscale");
    await expect.poll(() => axes(chart)).toEqual({ ...original, dragmode: "pan" });

    await modebarClick(chart, "Zoom in");
    await expect.poll(async () => (await axes(chart)).x).not.toEqual(original.x);
    await modebarClick(chart, "Reset axes");
    await expect.poll(() => axes(chart)).toEqual({ ...original, dragmode: "pan" });

    await modebarClick(chart, "Zoom");
    await expect.poll(() => axes(chart)).toEqual(original);
  });

  test("mode bar: closest / compare hover, spike lines and the range slider", async ({ page }) => {
    const chart = await openLine(page);
    const june = await pointPosition(chart, 0, 5);

    // "Show closest data on hover": only the point under the mouse gets a tooltip
    await modebarClick(chart, "Show closest data on hover");
    await expect.poll(async () => (await axes(chart)).hovermode).toBe("closest");
    await page.mouse.move(june.x - 30, june.y + 30);
    await page.mouse.move(june.x, june.y, { steps: 10 });
    await expect.poll(async () => (await hoverTexts(chart)).length).toBe(1);
    expect((await hoverTexts(chart))[0]).toContain("9,829.75000");

    // "Compare data on hover": all series at that X
    await modebarClick(chart, "Compare data on hover");
    await expect.poll(async () => (await axes(chart)).hovermode).toBe("x");
    await page.mouse.move(june.x, june.y + 40, { steps: 10 });
    await expect
      .poll(async () => (await hoverTexts(chart)).sort())
      .toEqual(
        [
          "Jun 1, 2026",
          "Hardware9,829.75000",
          "Services14,645.71000",
          "Software10,151.37000",
          "Training7,936.38000",
        ].sort()
      );

    await modebarClick(chart, "Toggle Spike Lines");
    await page.mouse.move(june.x - 20, june.y + 20);
    await page.mouse.move(june.x, june.y, { steps: 10 });
    await expect.poll(() => chart.locator(".spikeline").count()).toBeGreaterThan(0);
    await modebarClick(chart, "Toggle Spike Lines");
    await page.mouse.move(june.x - 20, june.y + 20);
    await page.mouse.move(june.x, june.y, { steps: 10 });
    await expect.poll(async () => (await hoverTexts(chart)).length).toBeGreaterThan(0);
    await expect(chart.locator(".spikeline")).toHaveCount(0);

    // The range slider appears under the plot, which gives up height for it
    const before = (await plot(chart)).plotBox as number[];
    await modebarClick(chart, "Toggle rangeslider");
    await expect(chart.locator(".rangeslider-container")).toHaveCount(1);
    await expect(async () => {
      const withSlider = (await plot(chart)).plotBox as number[];
      expect(withSlider[3]).toBeLessThan(before[3] - 30);
      const slider = await chart.locator(".rangeslider-container").boundingBox();
      expect(slider?.y).toBeGreaterThanOrEqual(withSlider[3]);
    }).toPass();
    await modebarClick(chart, "Toggle rangeslider");
    await expect(chart.locator(".rangeslider-container")).toHaveCount(0);
    await expect.poll(async () => (await plot(chart)).plotBox).toEqual(before);
  });

  test("Download plot as a PNG saves an image of the size of the chart", async ({ page }) => {
    const chart = await openLine(page);
    const size = await plot(chart);
    const downloading = page.waitForEvent("download");
    await modebarClick(chart, "Download plot as a PNG");
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("newplot.png");
    const file = fs.readFileSync(await download.path());
    expect(file.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // the PNG signature
    // width and height are in the IHDR chunk
    expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([size.width, size.height]);
    // An image of four lines, axes and a legend is far larger than an empty canvas
    expect(file.length).toBeGreaterThan(30_000);
  });

  test("the chart follows the window width and the legend never overlaps the plot", async ({ page }) => {
    const chart = await openLine(page);
    const container = async () => {
      const box = await chart.locator("xpath=..").boundingBox();
      return Math.round(box?.width ?? 0);
    };
    const widths: number[] = [];
    for (const [width, height] of [
      [1440, 900],
      [1100, 800],
      [800, 700],
      [560, 700],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(async () => {
        const drawn = await plot(chart);
        // The chart is exactly as wide as its container and keeps all its lines and legend items
        expect(drawn.width).toBe(await container());
        const svg = await chart.locator("svg.main-svg").first().boundingBox();
        expect(Math.round(svg?.width ?? 0)).toBe(drawn.width);
        expect(drawn.lines).toBe(4);
        expect(drawn.legend).toEqual(CATEGORIES);
        expect(overlaps(drawn.legendBox, drawn.plotBox)).toBe(false);
        const [plotBox, legendBox] = [drawn.plotBox as number[], drawn.legendBox as number[]];
        if (drawn.width <= 600) {
          // narrow: the legend moves below the plot
          expect(legendBox[1]).toBeGreaterThanOrEqual(plotBox[3]);
        } else {
          expect(legendBox[0]).toBeGreaterThanOrEqual(plotBox[2] - 1);
        }
      }, `viewport ${width}x${height}`).toPass();
      widths.push((await plot(chart)).width);
    }
    // Narrower window, narrower chart; back at the original size at the end
    expect(widths[1]).toBeLessThan(widths[0]);
    expect(widths[2]).toBeLessThan(widths[1]);
    expect(widths[3]).toBeLessThan(widths[2]);
    expect(widths[3]).toBeLessThanOrEqual(600);
    expect(widths[4]).toBe(widths[0]);
  });
});
