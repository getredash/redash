import type { Page } from "@playwright/test";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, centerOf, createVisualizationViaApi, selectOptions, toast } from "../../support/ui";
import {
  archiveQueries,
  chartType,
  choose,
  editor,
  editorTab,
  editVisualization,
  expectPlot,
  hoverTexts,
  legendItem,
  mapColumn,
  newChart,
  openQuery,
  overlaps,
  pageChart,
  plot,
  preview,
  savedOptions,
  saveVisualization,
  seedQueries,
  seriesRows,
  settledBox,
  settledCenter,
  setInput,
  visibility,
} from "./helpers";

const CITIES = [
  "Austin",
  "Berlin",
  "Lisbon",
  "London",
  "Mumbai",
  "Nairobi",
  "Paris",
  "Sao Paulo",
  "Sydney",
  "Tel Aviv",
  "Tokyo",
  "Toronto",
];

const tabs = (page: Page) => byTest(page, "QueryPageVisualizationTabs").locator(".ant-tabs-tab");

test.describe("Charts with many series; editing, renaming and deleting a chart", () => {
  let queries: { cities: number; manySeries: number; boxnum: number; channel: number };

  test.beforeAll(async ({ api, seed }) => {
    queries = await seedQueries(api, seed.dataSources.postgres, ["cities", "manySeries", "boxnum", "channel"]);
  });
  const cleanup: Record<string, number>[] = [];
  test.afterAll(async ({ api }) => {
    for (const ids of [queries, ...cleanup]) {
      await archiveQueries(api, ids);
    }
  });

  /** A line chart of revenue per month with one series per city, prepared through the API. */
  function cityChart(api: RedashApi, name: string, options: Record<string, unknown> = {}) {
    return createVisualizationViaApi(api, queries.cities, {
      type: "CHART",
      name,
      options: {
        globalSeriesType: "line",
        columnMapping: { month: "x", revenue: "y", city: "series" },
        ...options,
      },
    });
  }

  test("12 series: twelve colours, the legend fits to the right, or wraps below the plot", async ({ page, api }) => {
    await openQuery(page, queries.cities);
    await newChart(page, uniqueName("C 12 cities"));
    await chartType(page, "line");
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "revenue");
    await mapColumn(page, "series", "city");
    await expectPlot(preview(page), { legend: CITIES, lines: 12 });

    const right = await plot(preview(page));
    expect(new Set(right.legendColors).size).toBe(12);
    expect(overlaps(right.legendBox, right.plotBox)).toBe(false);
    const [plotBox, legendBox] = [right.plotBox as number[], right.legendBox as number[]];
    expect(legendBox[0]).toBeGreaterThanOrEqual(plotBox[2] - 1);
    // All twelve items fit beside the plot without scrolling
    expect(legendBox[3]).toBeLessThanOrEqual(plotBox[3]);

    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.Below");
    await expect(async () => {
      const below = await plot(preview(page));
      const [belowPlot, belowLegend] = [below.plotBox as number[], below.legendBox as number[]];
      expect(below.legend).toEqual(CITIES);
      expect(belowLegend[1]).toBeGreaterThanOrEqual(belowPlot[3]);
      expect(overlaps(below.legendBox, below.plotBox)).toBe(false);
      // wrapped into more than one row, but not one row per item
      const rows = new Set(
        await preview(page)
          .locator("g.legend g.traces")
          .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
      );
      expect(rows.size).toBeGreaterThan(1);
      expect(rows.size).toBeLessThan(6);
    }).toPass();

    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.cities, saved.id)).legend.placement).toBe("below");
    await expectPlot(pageChart(page), { legend: CITIES, lines: 12 });
    const onPage = await plot(pageChart(page));
    expect(overlaps(onPage.legendBox, onPage.plotBox)).toBe(false);
  });

  test("12 series stacked as bars with the legend below", async ({ page, api }) => {
    await openQuery(page, queries.cities);
    await newChart(page, uniqueName("C 12 cities stacked"));
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "revenue");
    await mapColumn(page, "series", "city");
    await choose(page, "Chart.Stacking", "Chart.Stacking.Stack");
    await choose(page, "Chart.LegendPlacement", "Chart.LegendPlacement.Below");
    await expectPlot(preview(page), { legend: CITIES, barmode: "relative" });
    const saved = await saveVisualization(page);
    expect((await savedOptions(api, queries.cities, saved.id)).series.stacking).toBe("stack");

    await expectPlot(pageChart(page), { legend: CITIES, barmode: "relative" });
    const drawn = await plot(pageChart(page));
    expect(drawn.traces).toHaveLength(12);
    expect(drawn.bars).toBeGreaterThan(100); // not every city sold something in every month
    expect(overlaps(drawn.legendBox, drawn.plotBox)).toBe(false);
  });

  test("12 series: the last row of the Series tab is dragged up to second place over the long list", async ({
    page,
    api,
  }) => {
    await openQuery(page, queries.cities);
    await newChart(page, uniqueName("C 12 cities reorder"));
    await chartType(page, "line");
    await mapColumn(page, "x", "month");
    await mapColumn(page, "y", "revenue");
    await mapColumn(page, "series", "city");
    await expectPlot(preview(page), { legend: CITIES });
    await editorTab(page, "Series");
    const rows = page.locator(".chart-editor-series tbody tr.sortable-element");
    await expect(rows).toHaveCount(12);

    await rows.nth(11).scrollIntoViewIfNeeded();
    const handle = await centerOf(rows.nth(11).locator(".drag-handle"));
    await page.mouse.move(handle.x, handle.y, { steps: 5 });
    await page.mouse.down();
    await page.mouse.move(handle.x, handle.y - 80, { steps: 10 });
    await expect(page.locator(".chart-editor-series-dragged-item")).toHaveCount(1);
    const second = await rows.nth(1).boundingBox();
    await page.mouse.move(handle.x, (second?.y ?? 0) + 4, { steps: 25 });
    await page.waitForTimeout(300); // let the list settle under the pointer before releasing
    await page.mouse.up();

    const reordered = ["Austin", "Toronto", ...CITIES.slice(1, 11)];
    await expect.poll(() => seriesRows(page)).toEqual(reordered.map((city, index) => `${city}#${index + 1}`));
    await expectPlot(preview(page), { legend: reordered });

    const saved = await saveVisualization(page);
    const options = await savedOptions(api, queries.cities, saved.id);
    const order = Object.entries(options.seriesOptions as Record<string, { zIndex: number }>)
      .sort((a, b) => a[1].zIndex - b[1].zIndex)
      .map(([key]) => key);
    expect(order).toEqual(reordered);
    await page.goto(`/queries/${queries.cities}#${saved.id}`);
    await expectPlot(pageChart(page), { legend: reordered });
  });

  test("a legend with more series than fit scrolls with the mouse wheel", async ({ page, api }) => {
    const id = await createVisualizationViaApi(api, queries.manySeries, {
      type: "CHART",
      name: uniqueName("C 48 series"),
      options: { globalSeriesType: "line", columnMapping: { month: "x", revenue: "y", series: "series" } },
    });
    await openQuery(page, queries.manySeries, id);
    const chart = pageChart(page);
    await expect.poll(async () => (await plot(chart)).legend.length).toBe(48);

    // The legend is clipped to the height of the chart and has a scroll bar
    const scrollbar = chart.locator("g.legend rect.scrollbar");
    await expect(scrollbar).toHaveCount(1);
    expect(Number(await scrollbar.getAttribute("height"))).toBeGreaterThan(0);
    const drawn = await plot(chart);
    const legendBox = drawn.legendBox as number[];
    expect(legendBox[3] - legendBox[1]).toBeLessThanOrEqual(drawn.height);

    const lastItem = chart.locator("g.legend g.traces").last();
    const scrollbox = chart.locator("g.legend g.scrollbox");
    const lastTop = async () => (await lastItem.boundingBox())?.y ?? 0;
    const startTop = await lastTop();
    expect(startTop).toBeGreaterThan(legendBox[3]); // below the visible part
    const startBar = (await scrollbar.boundingBox())?.y ?? 0;

    await page.mouse.move((legendBox[0] + legendBox[2]) / 2, (legendBox[1] + legendBox[3]) / 2, { steps: 5 });
    await page.mouse.wheel(0, 200);
    await expect.poll(lastTop).toBeLessThan(startTop - 30);
    await expect(scrollbox).toHaveAttribute("transform", /translate\(0,\s*-\d/);
    expect((await scrollbar.boundingBox())?.y).toBeGreaterThan(startBar);

    // Scrolled to the end, the last item is inside the legend and can be clicked to hide its series
    await page.mouse.wheel(0, 5000);
    await expect.poll(async () => (await lastTop()) + 10).toBeLessThan(legendBox[3]);
    const lastName = (await plot(chart)).legend.at(-1) as string;
    const item = await legendItem(chart, lastName);
    await page.mouse.click(item.x, item.y);
    await expect.poll(() => visibility(chart)).toContain(`${lastName}:legendonly`);

    await page.mouse.wheel(0, -5000);
    await expect.poll(lastTop).toBe(startTop);
  });

  test("an existing chart opens in the editor with its settings and is saved again under the same id", async ({
    page,
    api,
  }) => {
    const name = uniqueName("C edit me");
    const id = await cityChart(api, name);
    await openQuery(page, queries.cities, id);
    await expectPlot(pageChart(page), { lines: 12, fills: 0 });

    await editVisualization(page);
    await expect(byTest(page, "VisualizationName")).toHaveValue(name);
    await expect(byTest(page, "Chart.GlobalSeriesType")).toContainText("Line");
    await expect(byTest(page, "Chart.ColumnMapping.x")).toContainText("month");
    await expect(byTest(page, "Chart.ColumnMapping.y")).toContainText("revenue");
    await expect(byTest(page, "Chart.ColumnMapping.series")).toContainText("city");
    // The type of an existing visualization cannot be changed
    await expect(byTest(page, "VisualizationType")).toHaveClass(/ant-select-disabled/);
    await expectPlot(preview(page), { lines: 12, legend: CITIES });

    await chartType(page, "area");
    await expectPlot(preview(page), { fills: 12 });
    const saved = await saveVisualization(page);
    expect(saved.id).toBe(id);
    await expect(toast(page)).toContainText("Visualization saved");
    expect((await savedOptions(api, queries.cities, id)).globalSeriesType).toBe("area");
    await expectPlot(pageChart(page), { lines: 12, fills: 12, legend: CITIES });

    await page.reload();
    await expectPlot(pageChart(page), { lines: 12, fills: 12, legend: CITIES });
  });

  test("renaming a chart in the editor renames its tab at once and after a reload", async ({ page, api }) => {
    const name = uniqueName("C rename me");
    const id = await cityChart(api, name);
    await openQuery(page, queries.cities, id);
    await expect(byTest(page, `QueryPageVisualizationTab${id}`)).toContainText(name);

    await editVisualization(page);
    await byTest(page, "VisualizationName").fill(`${name} (renamed)`);
    const saved = await saveVisualization(page);
    expect(saved.name).toBe(`${name} (renamed)`);
    await expect(byTest(page, `QueryPageVisualizationTab${id}`)).toContainText(`${name} (renamed)`);

    await page.reload();
    await expect(byTest(page, `QueryPageVisualizationTab${id}`)).toContainText(`${name} (renamed)`);
    const query = await api.get(`/api/queries/${queries.cities}`);
    expect(query.visualizations.find((v: { id: number }) => v.id === id).name).toBe(`${name} (renamed)`);
  });

  test("Cancel with unsaved changes asks first; closing an untouched editor does not", async ({ page, api }) => {
    const id = await cityChart(api, uniqueName("C cancel me"));
    await openQuery(page, queries.cities, id);
    await expectPlot(pageChart(page), { lines: 12 });

    await editVisualization(page);
    await chartType(page, "scatter");
    await expectPlot(preview(page), { lines: 0 });
    await page.locator(".ant-modal-footer").getByRole("button", { name: "Cancel" }).click();
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Are you sure you want to close the editor without saving?");

    // "No" keeps the editor open with the change
    await confirm.getByRole("button", { name: "No" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(editor(page)).toBeVisible();
    await expect(byTest(page, "Chart.GlobalSeriesType")).toContainText("Scatter");

    await page.locator(".ant-modal-footer").getByRole("button", { name: "Cancel" }).click();
    await page.locator(".ant-modal-confirm").getByRole("button", { name: "Yes" }).click();
    await expect(editor(page)).toHaveCount(0);
    await expectPlot(pageChart(page), { lines: 12 });
    expect((await savedOptions(api, queries.cities, id)).globalSeriesType).toBe("line");

    // Without changes the X closes the editor directly
    await editVisualization(page);
    await page.locator(".ant-modal-close").click();
    await expect(editor(page)).toHaveCount(0);
    await expect(page.locator(".ant-modal-confirm")).toHaveCount(0);
  });

  test("switching between the Table and chart tabs keeps every chart at full size", async ({ page, api, seed }) => {
    // A query of its own: with the many charts of the shared query the tab bar scrolls and hides the Table tab
    const own = await seedQueries(api, seed.dataSources.postgres, ["cities"]);
    cleanup.push(own);
    const columnMapping = { month: "x", revenue: "y", city: "series" };
    const line = await createVisualizationViaApi(api, own.cities, {
      type: "CHART",
      name: uniqueName("C tabs line"),
      options: { globalSeriesType: "line", columnMapping },
    });
    const stacked = await createVisualizationViaApi(api, own.cities, {
      type: "CHART",
      name: uniqueName("C tabs stacked"),
      options: {
        globalSeriesType: "column",
        columnMapping,
        series: { stacking: "stack" },
        legend: { enabled: true, placement: "below" },
      },
    });
    await openQuery(page, own.cities, line);
    await expectPlot(pageChart(page), { lines: 12 });
    const size = await plot(pageChart(page));
    expect(size.width).toBeGreaterThan(600);
    expect(size.height).toBeGreaterThan(300);

    const expectFullSize = async (expected: { lines?: number; barmode?: string }) => {
      await expectPlot(pageChart(page), { ...expected, width: size.width, height: size.height });
      const drawn = await plot(pageChart(page));
      const plotBox = drawn.plotBox as number[];
      // the plot is not collapsed to a strip
      expect(plotBox[3] - plotBox[1]).toBeGreaterThan(drawn.height * 0.6);
      expect(plotBox[2] - plotBox[0]).toBeGreaterThan(drawn.width * 0.6);
    };

    await tabs(page).first().click();
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    await expect(pageChart(page)).toHaveCount(0);
    await byTest(page, `QueryPageVisualizationTab${line}`).click();
    await expectFullSize({ lines: 12 });
    await byTest(page, `QueryPageVisualizationTab${stacked}`).click();
    await expectFullSize({ barmode: "relative" });
    await byTest(page, `QueryPageVisualizationTab${line}`).click();
    await expectFullSize({ lines: 12 });
    await tabs(page).first().click();
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    await byTest(page, `QueryPageVisualizationTab${stacked}`).click();
    await expectFullSize({ barmode: "relative" });
  });

  test("a chart is deleted with the x on its tab after confirmation", async ({ page, api }) => {
    const name = uniqueName("C delete me");
    const id = await cityChart(api, name);
    await openQuery(page, queries.cities, id);
    const tab = byTest(page, `QueryPageVisualizationTab${id}`);
    await expect(tab).toContainText(name);
    await expectPlot(pageChart(page), { lines: 12 });

    // With many charts on the query the tab bar scrolls to the selected tab once the page has its final width
    await settledBox(tab.locator(".delete-visualization-button"));

    // Cancel keeps it
    await tab.locator(".delete-visualization-button").click();
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Delete Visualization");
    await expect(confirm).toContainText("Are you sure you want to delete this visualization?");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(tab).toBeVisible();

    await tab.locator(".delete-visualization-button").click();
    const deleted = page.waitForResponse(
      (r) => r.url().endsWith(`/api/visualizations/${id}`) && r.request().method() === "DELETE"
    );
    await page.locator(".ant-modal-confirm").getByRole("button", { name: "Delete" }).click();
    expect((await deleted).status()).toBe(200);
    await expect(tab).toHaveCount(0);
    const query = await api.get(`/api/queries/${queries.cities}`);
    expect(query.visualizations.map((v: { id: number }) => v.id)).not.toContain(id);
  });

  test("the deprecated Boxplot type is not offered for new visualizations", async ({ page }) => {
    await openQuery(page, queries.boxnum);
    await newChart(page);
    await byTest(page, "VisualizationType").locator(".ant-select-selector").click();
    await expect(selectOptions(page).first()).toBeVisible();
    // The list is short enough to be rendered completely
    const types = (await selectOptions(page).allInnerTexts()).map((type) => type.trim());
    expect(types).toContain("Chart");
    expect(types).toContain("Table");
    expect(types.filter((type) => /box/i.test(type))).toEqual([]);
  });

  test("a deprecated Boxplot created through the API is drawn and can be edited", async ({ page, api }) => {
    const name = uniqueName("C legacy boxplot");
    const id = await createVisualizationViaApi(api, queries.boxnum, { type: "BOXPLOT", name });
    await openQuery(page, queries.boxnum, id);
    const boxplot = page.locator(".visualization-renderer .box-plot-deprecated-visualization-container:visible");
    // One box per numeric column, each with a median line and two whiskers
    await expect(boxplot.locator("rect.box")).toHaveCount(3);
    await expect(boxplot.locator("line.median")).toHaveCount(3);
    await expect(boxplot.locator("line.whisker")).toHaveCount(6);
    const ticks = await boxplot.locator(".tick text").allTextContents();
    for (const column of ["quantity", "amount_100", "bucket"]) {
      expect(ticks).toContain(column);
    }
    const box = await boxplot.locator("rect.box").first().boundingBox();
    expect(box?.height).toBeGreaterThan(20);
    expect(box?.width).toBeGreaterThan(20);

    await editVisualization(page);
    await expect(byTest(page, "VisualizationType")).toContainText("Boxplot (Deprecated)");
    await expect(byTest(page, "VisualizationType")).toHaveClass(/ant-select-disabled/);
    await setInput(page, "BoxPlot.XAxisLabel", "Measure");
    const previewTexts = byTest(page, "VisualizationPreview").locator("svg text");
    await expect(previewTexts.filter({ hasText: /^Measure$/ })).toHaveCount(1);
    await setInput(page, "BoxPlot.YAxisLabel", "Value");
    await expect(previewTexts.filter({ hasText: /^Value$/ })).toHaveCount(1);

    const saved = await saveVisualization(page);
    expect(saved.id).toBe(id);
    expect(saved.type).toBe("BOXPLOT");
    expect(await savedOptions(api, queries.boxnum, id)).toMatchObject({ xAxisLabel: "Measure", yAxisLabel: "Value" });
    await expect(boxplot.locator("svg text").filter({ hasText: /^Measure$/ })).toHaveCount(1);
    await expect(boxplot.locator("rect.box")).toHaveCount(3);
  });

  test("Enable click events: a click on a bar opens the URL template filled with the point's values", async ({
    page,
    api,
    context,
  }) => {
    await openQuery(page, queries.channel);
    await newChart(page, uniqueName("C click events"));
    await mapColumn(page, "x", "channel");
    await mapColumn(page, "y", "orders");
    await expectPlot(preview(page), { bars: 3, xTicks: ["direct", "partner", "web"] });

    // Until click events are enabled the two related controls are disabled
    const template = editor(page).getByPlaceholder("(nothing)");
    await expect(byTest(page, "Chart.EnableClickEvents")).not.toBeChecked();
    await expect(byTest(page, "Chart.EnableClickEvents.NewTab")).toBeDisabled();
    await expect(template).toBeDisabled();
    await byTest(page, "Chart.EnableClickEvents").check();
    await expect(byTest(page, "Chart.EnableClickEvents.NewTab")).toBeEnabled();
    await expect(byTest(page, "Chart.EnableClickEvents.NewTab")).toBeChecked();
    await template.click();
    await page.keyboard.type("/ping?channel={{ @@x }}&orders={{ @@y }}&none={{ @@nothing }}");
    await expect(template).toHaveValue("/ping?channel={{ @@x }}&orders={{ @@y }}&none={{ @@nothing }}");
    // The template is applied after a short debounce: give it the time a person needs to reach Save
    await page.waitForTimeout(600);

    const saved = await saveVisualization(page);
    expect(await savedOptions(api, queries.channel, saved.id)).toMatchObject({
      enableLink: true,
      linkOpenNewTab: true,
      linkFormat: "/ping?channel={{ @@x }}&orders={{ @@y }}&none={{ @@nothing }}",
    });

    // The channels have 189 (direct), 203 (partner) and 208 (web) orders
    const orders = (await api.get(`/api/queries/${queries.channel}/results`)).query_result.data.rows as {
      channel: string;
      orders: number;
    }[];
    const partner = orders.find((row) => row.channel === "partner")?.orders;

    await expectPlot(pageChart(page), { bars: 3 });
    const bar = await settledCenter(pageChart(page).locator("g.barlayer g.point path").nth(1));
    const opening = context.waitForEvent("page");
    await page.mouse.move(bar.x, bar.y, { steps: 5 });
    // Plotly takes the clicked point from the last hover it handled, and handles hovers with a delay: wait until
    // the hover label shows the bar under the mouse (the mouse crossed the "web" bar on its way)
    await expect.poll(async () => (await hoverTexts(pageChart(page))).join(" ")).toContain("partner");
    await page.mouse.click(bar.x, bar.y);
    const opened = await opening;
    // Unknown references are replaced by nothing
    await expect(opened).toHaveURL(new RegExp(`/ping\\?channel=partner&orders=${partner}&none=$`));
    await opened.close();

    // With "Open in new tab" switched off the same click navigates this tab
    await editVisualization(page);
    await byTest(page, "Chart.EnableClickEvents.NewTab").uncheck();
    await saveVisualization(page);
    expect((await savedOptions(api, queries.channel, saved.id)).linkOpenNewTab).toBe(false);
    await expectPlot(pageChart(page), { bars: 3 });
    const web = await settledCenter(pageChart(page).locator("g.barlayer g.point path").nth(2));
    await page.mouse.move(web.x, web.y, { steps: 5 });
    await page.mouse.click(web.x, web.y);
    await expect(page).toHaveURL(/\/ping\?channel=web&orders=\d+&none=$/);
  });
});
