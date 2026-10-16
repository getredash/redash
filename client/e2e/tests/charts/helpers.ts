import type { Locator, Page } from "@playwright/test";
import { expect, type RedashApi, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, retype } from "../../support/ui";

/** The queries the chart tests draw. All read the demo `orders` and `cities` tables, whose content is fixed. */
export const SQL = {
  // month (date) x category (4): 10 months x 4 categories
  monthly:
    "select date_trunc('month', created_at)::date as month, category, count(*) as orders, sum(amount) as revenue, round(avg(amount)::numeric, 2) as avg_amount, round((stddev(amount)/sqrt(count(*)))::numeric, 2) as err from orders group by 1, 2 order by 1, 2",
  // 3 channels
  channel:
    "select channel, sum(amount) as revenue, count(*) as orders, sum(quantity) as qty from orders group by 1 order by 1",
  // 4 categories x 3 channels
  catchan:
    "select category, channel, sum(amount) as revenue, count(*) as orders from orders group by 1, 2 order by 1, 2",
  // 300 single orders
  points: "select id, quantity, amount, category, channel from orders order by id limit 300",
  bubble:
    "select c.name as city, o.category, round(avg(o.quantity)::numeric, 2) as avg_qty, round(avg(o.amount)::numeric, 2) as avg_amount, count(*) as orders from orders o join cities c on c.id = o.city_id group by 1, 2 order by 1, 2",
  // one row per month, `month_label` is text ('2026-01'), `avg_gap` is NULL in March and July
  combined:
    "select to_char(date_trunc('month', created_at), 'YYYY-MM') as month_label, date_trunc('month', created_at)::date as month, count(*) as orders, sum(amount) as revenue, sum(quantity) as qty, case when extract(month from created_at) in (3, 7) then null else round(avg(amount)::numeric, 2) end as avg_gap from orders group by 1, 2, extract(month from created_at) order by 1",
  // numeric columns only, for the deprecated Boxplot
  boxnum:
    "select quantity, round((amount / 100)::numeric, 2) as amount_100, (id % 17) + 1 as bucket from orders order by id limit 300",
  // month x city: 12 series
  cities:
    "select date_trunc('month', o.created_at)::date as month, c.name as city, sum(o.amount) as revenue from orders o join cities c on c.id = o.city_id group by 1, 2 order by 1, 2",
  // month x (city, category): 48 series, more than a legend can show at once
  manySeries:
    "select date_trunc('month', o.created_at)::date as month, c.name || ' / ' || o.category as series, sum(o.amount) as revenue from orders o join cities c on c.id = o.city_id group by 1, 2 order by 1, 2",
  // deliberately not sorted by the X column
  unsorted: "select * from (values ('cherry', 3), ('apple', 1), ('banana', 2)) as t(fruit, amount)",
} as const;

export type QueryKey = keyof typeof SQL;

/** Creates and runs the named queries through the API; returns their ids. */
export async function seedQueries<K extends QueryKey>(
  api: RedashApi,
  dataSourceId: number,
  keys: K[]
): Promise<Record<K, number>> {
  const ids = {} as Record<K, number>;
  for (const key of keys) {
    const query = await createQueryViaApi(api, {
      name: uniqueName(`C chart data ${key}`),
      dataSourceId,
      sql: SQL[key],
    });
    ids[key] = query.id;
  }
  return ids;
}

/** Archives the queries created by `seedQueries`. */
export async function archiveQueries(api: RedashApi, ids: Record<string, number> | undefined) {
  for (const id of Object.values(ids || {})) {
    await api.delete(`/api/queries/${id}`).catch(() => undefined);
  }
}

// ---------- the chart editor ----------

export const editor = (page: Page) => byTest(page, "VisualizationEditor");
/** The Plotly chart in the editor's preview. */
export const preview = (page: Page) => page.locator('[data-test="VisualizationPreview"] .js-plotly-plot');
/** The Plotly chart shown on the query page (the one of the selected visualization tab). */
export const pageChart = (page: Page) => page.locator(".visualization-renderer .js-plotly-plot:visible");

/** Opens the query's source page, which shows the cached result and the visualization tabs. */
export async function openQuery(page: Page, queryId: number, visualizationId?: number) {
  await page.goto(`/queries/${queryId}/source${visualizationId ? `#${visualizationId}` : ""}`);
  await expect(byTest(page, "NewVisualization")).toBeVisible({ timeout: 30_000 });
}

/** Clicks "New Visualization"; the editor opens on the Chart type. Types the name when given. */
export async function newChart(page: Page, name?: string) {
  await byTest(page, "NewVisualization").click();
  await expect(editor(page)).toBeVisible();
  await expect(byTest(page, "Chart.GlobalSeriesType")).toBeVisible();
  if (name) {
    await byTest(page, "VisualizationName").fill(name);
  }
}

/** Opens the editor of the visualization whose tab is selected. */
export async function editVisualization(page: Page) {
  await page.getByRole("button", { name: "Edit Visualization" }).click();
  await expect(editor(page)).toBeVisible();
}

// A dropdown that was just closed stays in the DOM while it fades out, so "open" means visible
const openDropdown = ".ant-select-dropdown:visible";

/** Opens the antd Select with this `data-test` and clicks the option with that `data-test`. */
export async function choose(page: Page, select: string, option: string) {
  await expect(page.locator(openDropdown)).toHaveCount(0);
  await byTest(page, select).first().scrollIntoViewIfNeeded();
  await byTest(page, select).first().locator(".ant-select-selector").click();
  const item = page.locator(`${openDropdown} [data-test="${option}"]`).first();
  // Long lists are virtual: options that are not on screen do not exist until the list is scrolled
  for (let attempt = 0; attempt < 15 && (await item.count()) === 0; attempt += 1) {
    await page.locator(openDropdown).last().hover();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(100);
  }
  await item.click();
}

/** Clicks the dialog title: closes a multi-select dropdown or a colour picker that stays open. */
export async function clickAway(page: Page) {
  await page.locator(".ant-modal-title").first().click();
}

/** The colour picker popover that is open. */
export const colorPicker = (page: Page) => page.locator('[data-test="ColorPicker"]:visible');

/** Opens the colour picker of the element with this `data-test` (a series, a pie value, a heatmap bound). */
export async function openColorPicker(page: Page, name: string) {
  await expect(colorPicker(page)).toHaveCount(0);
  await byTest(page, name).locator(".color-picker-trigger").click();
  await expect(colorPicker(page)).toHaveCount(1);
  return colorPicker(page);
}

/** Types a hex colour into the open colour picker. */
export async function typeCustomColor(page: Page, hex: string) {
  await colorPicker(page).locator('[data-test="ColorPicker.CustomColor"]').click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(hex, { delay: 30 });
}

/** Closes the colour picker with a click outside of it. */
export async function closeColorPicker(page: Page) {
  await clickAway(page);
  await expect(colorPicker(page)).toHaveCount(0);
}

export async function chartType(page: Page, type: string) {
  await choose(page, "Chart.GlobalSeriesType", `Chart.ChartType.${type}`);
}

/** Maps a result column to a role: x, y, series, yError, size, zVal. */
export async function mapColumn(page: Page, role: string, column: string) {
  await choose(page, `Chart.ColumnMapping.${role}`, `Chart.ColumnMapping.${role}.${column}`);
  if (role === "y") {
    await clickAway(page); // Y columns is a multi-select: its dropdown stays open
    await expect(page.locator(openDropdown)).toHaveCount(0);
  }
}

export async function editorTab(page: Page, name: "General" | "XAxis" | "YAxis" | "Series" | "Colors" | "DataLabels") {
  await byTest(page, `VisualizationEditor.Tabs.${name}`).click();
}

/**
 * Replaces the content of an input of the editor by typing.
 *
 * The editor applies typed values after a 200 ms debounce that several fields share, and a change in a second
 * field within that time replaces the first one. So wait for the effect of one input (assert on the preview)
 * before touching the next control, as a person does by looking at the chart.
 */
export async function setInput(page: Page, name: string, value: string) {
  const input = byTest(page, name).locator("visible=true").first();
  await input.scrollIntoViewIfNeeded();
  await input.click();
  if (value === "") {
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
  } else {
    await retype(page, value);
  }
}

/** The labels of the options of an antd Select, read by opening it; closes it again. */
export async function optionsOf(page: Page, select: string): Promise<string[]> {
  await expect(page.locator(openDropdown)).toHaveCount(0);
  await byTest(page, select).first().locator(".ant-select-selector").click();
  const options = page.locator(`${openDropdown} .ant-select-item-option`);
  await expect(options.first()).toBeVisible();
  const labels = await options.allInnerTexts();
  await clickAway(page);
  await expect(page.locator(openDropdown)).toHaveCount(0);
  return labels.map((label) => label.trim());
}

export interface SavedVisualization {
  id: number;
  name: string;
  type: string;
  options: any;
}

/** Clicks Save in the editor; returns what the server answered once the dialog has closed. */
export async function saveVisualization(page: Page): Promise<SavedVisualization> {
  const response = page.waitForResponse(
    (r) => /\/api\/visualizations(\/\d+)?$/.test(r.url()) && r.request().method() === "POST"
  );
  await page.locator(".ant-modal-footer").getByRole("button", { name: "Save" }).click();
  const saved = await (await response).json();
  await expect(editor(page)).toHaveCount(0);
  return saved;
}

/** The visualization as the API returns it now. */
export async function savedOptions(api: RedashApi, queryId: number, visualizationId: number) {
  const query = await api.get(`/api/queries/${queryId}`);
  const visualization = (query.visualizations as SavedVisualization[]).find((v) => v.id === visualizationId);
  expect(visualization, `visualization ${visualizationId} of query ${queryId}`).toBeDefined();
  return (visualization as SavedVisualization).options;
}

// ---------- reading what Plotly drew ----------

export interface PlotState {
  width: number;
  height: number;
  /** One entry per trace: `type[/mode][/orientation]:name[(off)][@y2]`. */
  traces: string[];
  lines: number;
  fills: number;
  bars: number;
  points: number;
  slices: number;
  boxes: number;
  heatmaps: number;
  errorBars: number;
  legend: string[];
  /** Fill (or stroke) colour of each legend item, in legend order. */
  legendColors: string[];
  xTicks: string[];
  yTicks: string[];
  y2Ticks: string[];
  xTitle: string | null;
  yTitle: string | null;
  y2Title: string | null;
  /** Data labels drawn in the plot. */
  labels: string[];
  annotations: string[];
  xType: string | null;
  yType: string | null;
  xRange: (string | number)[] | null;
  yRange: number[] | null;
  y2Range: number[] | null;
  barmode: string | null;
  barnorm: string | null;
  lineShapes: string[];
  /** [left, top, right, bottom] of the plot area and of the legend, in page pixels. */
  plotBox: number[] | null;
  legendBox: number[] | null;
  modebar: string[];
}

/** What Plotly drew in this chart element: its own data/layout state plus the SVG. Read-only. */
export async function plot(chart: Locator): Promise<PlotState> {
  return chart.first().evaluate((gd: HTMLElement) => {
    const g = gd as any;
    const count = (selector: string) => gd.querySelectorAll(selector).length;
    const texts = (selector: string) => Array.from(gd.querySelectorAll(selector)).map((e) => e.textContent || "");
    const box = (element: Element | null) => {
      if (!element) return null;
      const b = element.getBoundingClientRect();
      return [b.left, b.top, b.right, b.bottom].map(Math.round);
    };
    const data: any[] = g.data || [];
    const layout = g.layout || {};
    const full = g._fullLayout || {};
    return {
      width: Math.round(gd.getBoundingClientRect().width),
      height: Math.round(gd.getBoundingClientRect().height),
      traces: data.map(
        (d) =>
          `${d.type || "scatter"}${d.mode ? `/${d.mode}` : ""}${d.orientation ? `/${d.orientation}` : ""}:${d.name}` +
          `${d.visible === "legendonly" ? "(off)" : ""}${d.yaxis && d.yaxis !== "y" ? `@${d.yaxis}` : ""}`
      ),
      lines: count("g.scatterlayer path.js-line"),
      fills: count("g.scatterlayer path.js-fill"),
      bars: count("g.barlayer g.point"),
      points: count("g.points path, g.points g.point"),
      slices: count("g.slice"),
      boxes: count("g.boxlayer path.box"),
      heatmaps: count("g.heatmaplayer image, g.hm image"),
      errorBars: count("g.errorbar"),
      legend: texts("g.legend text.legendtext"),
      legendColors: Array.from(gd.querySelectorAll("g.legend g.traces")).map((item) => {
        const mark = item.querySelector<SVGElement>(".legendpoints path, .legendlines path, .legendfill path");
        if (!mark) return "";
        return mark.style.fill && mark.style.fill !== "none" ? mark.style.fill : mark.style.stroke;
      }),
      xTicks: texts("g.xtick text"),
      yTicks: texts("g.ytick text"),
      y2Ticks: texts("g.y2tick text"),
      xTitle: texts("g.g-xtitle text")[0] ?? null,
      yTitle: texts("g.g-ytitle text")[0] ?? null,
      y2Title: texts("g.g-y2title text")[0] ?? null,
      labels: texts("text.bartext, g.textpoint text, g.slicetext text"),
      annotations: texts("g.annotation text"),
      xType: full.xaxis?.type ?? null,
      yType: full.yaxis?.type ?? null,
      xRange: full.xaxis?.range ? Array.from(full.xaxis.range) : null,
      yRange: full.yaxis?.range ? Array.from(full.yaxis.range) : null,
      y2Range: full.yaxis2?.range ? Array.from(full.yaxis2.range) : null,
      barmode: layout.barmode ?? null,
      barnorm: layout.barnorm ?? null,
      lineShapes: Array.from(new Set(data.map((d) => d.line?.shape).filter(Boolean))),
      plotBox: box(gd.querySelector(".draglayer .nsewdrag") || gd.querySelector(".bglayer .bg")),
      // the legend's background is its visible box; the items of a scrolling legend extend beyond it
      legendBox: box(gd.querySelector("g.legend rect.bg") || gd.querySelector("g.legend")),
      modebar: Array.from(gd.querySelectorAll(".modebar-btn")).map((b) => b.getAttribute("data-title") || ""),
    } as PlotState;
  });
}

/** Waits until the chart's state contains the expected values (compared like `toMatchObject`). */
export async function expectPlot(chart: Locator, expected: Partial<PlotState>, message?: string) {
  await expect(async () => {
    expect(await plot(chart), message).toMatchObject(expected);
  }).toPass({ timeout: 15_000 });
}

/** Evaluates a function on Plotly's graph div (`gd.data`, `gd.layout`, `gd._fullLayout`). Read-only use. */
export async function readPlot<T, A = undefined>(chart: Locator, fn: (gd: any, arg: A) => T, arg?: A): Promise<T> {
  return chart.first().evaluate(fn as any, arg as any) as Promise<T>;
}

/** Page coordinates of point `index` of trace `trace` (for hovering it with the real mouse). */
export async function pointPosition(chart: Locator, trace: number, index: number): Promise<{ x: number; y: number }> {
  await plotArea(chart);
  return readPlot(
    chart,
    (gd, [k, i]) => {
      const layout = gd._fullLayout;
      const d = gd.data[k];
      const rect = gd.getBoundingClientRect();
      const yAxis = d.yaxis === "y2" ? layout.yaxis2 : layout.yaxis;
      return {
        x: rect.left + layout.xaxis._offset + layout.xaxis.d2p(d.x[i]),
        y: rect.top + yAxis._offset + yAxis.d2p(d.y[i]),
      };
    },
    [trace, index] as [number, number]
  );
}

/**
 * The bounding box of an element once it has stopped moving. A chart is redrawn when its container changes size
 * (a dialog closes, a scroll bar goes away), so a position measured right after such a change may be stale by
 * the time the mouse gets there.
 */
export async function settledBox(locator: Locator) {
  let previous = "";
  let box: { x: number; y: number; width: number; height: number } | null = null;
  await expect(async () => {
    box = await locator.first().boundingBox();
    const current = JSON.stringify(box);
    const settled = box !== null && current === previous;
    previous = current;
    expect(settled, "the element is drawn and no longer moves").toBe(true);
  }).toPass({ intervals: [150, 150, 250, 250, 500] });
  return box as unknown as { x: number; y: number; width: number; height: number };
}

/** The center of an element once it has stopped moving. */
export async function settledCenter(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await settledBox(locator);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The plot area (where the data is drawn) in page coordinates. */
export async function plotArea(chart: Locator) {
  return settledBox(chart.first().locator(".draglayer .nsewdrag").first());
}

/** Texts of the hover tooltips that are shown. */
export async function hoverTexts(chart: Locator): Promise<string[]> {
  return chart.first().locator(".hoverlayer g.hovertext, .hoverlayer g.axistext").allTextContents();
}

/** Name and visibility of each trace: `Hardware:true`, `Services:legendonly`. */
export async function visibility(chart: Locator): Promise<string[]> {
  return readPlot(chart, (gd) => gd.data.map((d: any) => `${d.name}:${d.visible === undefined ? true : d.visible}`));
}

/** The center of the legend item with this text. */
export async function legendItem(chart: Locator, name: string): Promise<{ x: number; y: number }> {
  const toggle = chart
    .first()
    .locator("g.legend g.traces")
    .filter({ has: chart.page().locator("text.legendtext", { hasText: new RegExp(`^${name}$`) }) })
    .locator("rect.legendtoggle");
  return settledCenter(toggle);
}

/** Shows the mode bar by moving the mouse over the plot, then clicks the button with this title. */
export async function modebarClick(chart: Locator, title: string) {
  const page = chart.page();
  const area = await plotArea(chart);
  await page.mouse.move(area.x + area.width / 2, area.y + 30, { steps: 5 });
  const button = chart.first().locator(`.modebar-btn[data-title="${title}"]`).first();
  await button.hover();
  await button.click();
}

/** True when two [left, top, right, bottom] boxes overlap by more than a pixel. */
export function overlaps(a: number[] | null, b: number[] | null): boolean {
  if (!a || !b) {
    return false;
  }
  return a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1;
}

/** The rows of the Series tab: `key#order`. */
export async function seriesRows(page: Page): Promise<string[]> {
  return page
    .locator(".chart-editor-series tbody tr.sortable-element")
    .evaluateAll((rows) =>
      rows.map((r) => `${r.getAttribute("data-row-key")}#${r.querySelector(".series-settings-order")?.textContent}`)
    );
}
