import type { Locator, Page } from "@playwright/test";
import { expect, type RedashApi, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, createVisualizationViaApi, retype, selectOptions } from "../../support/ui";

// ---------- data prepared through the API ----------

export interface SeededQuery {
  id: number;
  name: string;
  api_key: string;
  /** Visualization ids by a short key; `table` is the table every query gets. */
  viz: Record<string, number>;
}

/** Remembers what a spec file created, so `afterAll` can archive it and list pages stay short. */
export class Created {
  dashboards: number[] = [];
  queries: number[] = [];

  async archiveAll(api: RedashApi) {
    for (const id of this.dashboards) {
      await api.delete(`/api/dashboards/${id}`).catch(() => undefined);
    }
    for (const id of this.queries) {
      await api.delete(`/api/queries/${id}`).catch(() => undefined);
    }
  }
}

const numberParameter = (name: string, value: number) => ({ name, title: name, type: "number", value, global: false });

async function seedQuery(
  api: RedashApi,
  created: Created,
  seed: { name: string; dataSourceId: number; sql: string; parameters?: Record<string, unknown>[] },
  visualizations: Record<string, { type: string; name: string; options: Record<string, unknown> }> = {}
): Promise<SeededQuery> {
  const name = uniqueName(seed.name);
  const query = await createQueryViaApi(api, {
    name,
    dataSourceId: seed.dataSourceId,
    sql: seed.sql,
    options: { parameters: seed.parameters || [] },
  });
  created.queries.push(query.id);
  const saved = await api.get(`/api/queries/${query.id}`);
  const viz: Record<string, number> = {
    table: saved.visualizations.find((v: { type: string }) => v.type === "TABLE").id,
  };
  for (const [key, visualization] of Object.entries(visualizations)) {
    viz[key] = await createVisualizationViaApi(api, query.id, visualization);
  }
  return { id: query.id, name, api_key: saved.api_key, viz };
}

/** Names of the visualizations the seeded queries get (the names are the same in every spec file). */
export const VIZ = {
  bar: "D Bar revenue",
  pie: "D Pie orders",
  counter: "D Counter revenue",
  map: "D Map cities",
  filterChart: "D Filter chart",
  result: "D Counter result",
};

/** The queries of the original exploratory run, each under a unique name. */
export const seedQueries = {
  /** category, revenue, orders: 4 rows; bar chart, pie chart and counter visualizations. */
  byCategory: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(
      api,
      created,
      {
        name: "D orders by category",
        dataSourceId,
        sql: "select category, sum(amount) as revenue, count(*) as orders from orders group by 1 order by 1",
      },
      {
        bar: {
          type: "CHART",
          name: VIZ.bar,
          options: { globalSeriesType: "column", columnMapping: { category: "x", revenue: "y" } },
        },
        pie: {
          type: "CHART",
          name: VIZ.pie,
          options: { globalSeriesType: "pie", columnMapping: { category: "x", orders: "y" } },
        },
        counter: { type: "COUNTER", name: VIZ.counter, options: { counterColName: "revenue", rowNumber: 1 } },
      }
    ),

  /** A table whose number of rows is the number parameter `rows` (default 12). */
  tableRows: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(api, created, {
      name: "D orders table rows",
      dataSourceId,
      sql: "select id, category, channel, amount, customer from orders order by id limit {{ rows }}",
      parameters: [numberParameter("rows", 12)],
    }),

  citiesMap: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(
      api,
      created,
      { name: "D cities map", dataSourceId, sql: "select name, country, lat, lon from cities order by name" },
      { map: { type: "MAP", name: VIZ.map, options: { latColName: "lat", lonColName: "lon" } } }
    ),

  /** category::filter x channel::multi-filter, revenue and n; with a column chart of revenue by channel. */
  filtersRevenue: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(
      api,
      created,
      {
        name: "D filters revenue",
        dataSourceId,
        sql:
          'select category as "category::filter", channel as "channel::multi-filter", sum(amount) as revenue, ' +
          "count(*) as n from orders group by 1, 2 order by 1, 2",
      },
      {
        chart: {
          type: "CHART",
          name: VIZ.filterChart,
          options: { globalSeriesType: "column", columnMapping: { "channel::multi-filter": "x", revenue: "y" } },
        },
      }
    ),

  filtersQuantity: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(api, created, {
      name: "D filters quantity",
      dataSourceId,
      sql:
        'select category as "category::filter", channel as "channel::multi-filter", sum(quantity) as quantity, ' +
        "max(amount) as max_amount from orders group by 1, 2 order by 1, 2",
    }),

  /** Number parameter `min_qty` and dropdown parameter `cat`. */
  byChannel: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(api, created, {
      name: "D param by channel",
      dataSourceId,
      sql:
        "select channel, count(*) as orders, sum(amount) as revenue from orders " +
        "where quantity >= {{ min_qty }} and category = '{{ cat }}' group by 1 order by 1",
      parameters: [
        numberParameter("min_qty", 1),
        {
          name: "cat",
          title: "cat",
          type: "enum",
          enumOptions: "Hardware\nSoftware\nServices\nTraining",
          value: "Hardware",
          global: false,
        },
      ],
    }),

  /** Number parameter `min_qty` and TEXT parameter `cust` (which makes it unsafe for sharing and embedding). */
  byCustomer: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(api, created, {
      name: "D param by customer",
      dataSourceId,
      sql:
        "select customer, quantity, amount from orders where quantity >= {{ min_qty }} " +
        "and customer ilike '%{{ cust }}%' order by amount desc limit 8",
      parameters: [
        numberParameter("min_qty", 1),
        { name: "cust", title: "cust", type: "text", value: "a", global: false },
      ],
    }),

  /** `1000 / {{ divisor }}` (default 4): fails with "division by zero" for 0; counter visualization of the result. */
  divide: (api: RedashApi, created: Created, dataSourceId: number) =>
    seedQuery(
      api,
      created,
      {
        name: "D divide",
        dataSourceId,
        sql: "select 1000 / {{ divisor }} as result, count(*) as orders from orders",
        parameters: [numberParameter("divisor", 4)],
      },
      { result: { type: "COUNTER", name: VIZ.result, options: { counterColName: "result", rowNumber: 1 } } }
    ),
};

export interface Position {
  col: number;
  row: number;
  sizeX: number;
  sizeY: number;
  autoHeight?: boolean;
}

const fullPosition = (position: Position) => ({
  minSizeX: 1,
  maxSizeX: 12,
  minSizeY: 1,
  maxSizeY: 1000,
  autoHeight: false,
  ...position,
});

export async function createDashboardViaApi(
  api: RedashApi,
  created: Created,
  name: string,
  options: { publish?: boolean; filters?: boolean } = {}
): Promise<{ id: number; name: string; slug: string }> {
  const fullName = uniqueName(name);
  const dashboard = await api.post("/api/dashboards", { name: fullName });
  created.dashboards.push(dashboard.id);
  if (options.publish || options.filters) {
    await api.post(`/api/dashboards/${dashboard.id}`, {
      ...(options.publish ? { is_draft: false } : {}),
      ...(options.filters ? { dashboard_filters_enabled: true } : {}),
    });
  }
  return { id: dashboard.id, name: fullName, slug: dashboard.slug };
}

/** `parameterMappings` of a widget whose parameters are all dashboard parameters of the same name. */
export function dashboardLevel(...names: string[]) {
  return Object.fromEntries(
    names.map((name) => [name, { name, type: "dashboard-level", mapTo: name, value: null, title: "" }])
  );
}

export async function addWidgetViaApi(
  api: RedashApi,
  dashboardId: number,
  visualizationId: number,
  position: Position,
  parameterMappings: Record<string, unknown> = {}
): Promise<number> {
  const widget = await api.post("/api/widgets", {
    dashboard_id: dashboardId,
    visualization_id: visualizationId,
    text: "",
    width: 1,
    options: { isHidden: false, parameterMappings, position: fullPosition(position) },
  });
  return widget.id;
}

export async function addTextboxViaApi(
  api: RedashApi,
  dashboardId: number,
  text: string,
  position: Position
): Promise<number> {
  const widget = await api.post("/api/widgets", {
    dashboard_id: dashboardId,
    visualization_id: null,
    text,
    width: 1,
    options: { isHidden: false, parameterMappings: {}, position: fullPosition(position) },
  });
  return widget.id;
}

interface ApiWidget {
  id: number;
  text: string;
  visualization?: { id: number; name: string; query: { id: number; name: string } };
  options: { position: Position; parameterMappings: Record<string, { type: string; mapTo: string; value: unknown }> };
}

export async function getDashboard(api: RedashApi, id: number) {
  return (await api.get(`/api/dashboards/${id}`)) as {
    id: number;
    name: string;
    slug: string;
    version: number;
    is_draft: boolean;
    is_archived: boolean;
    is_favorite: boolean;
    dashboard_filters_enabled: boolean;
    tags: string[];
    options: { globalParamOrder?: string[] };
    public_url?: string;
    widgets: ApiWidget[];
  };
}

/** Saved grid positions by widget id: `{ col, row, sizeX, sizeY }`. */
export async function savedPositions(api: RedashApi, dashboardId: number) {
  const dashboard = await getDashboard(api, dashboardId);
  return Object.fromEntries(
    dashboard.widgets.map((widget) => {
      const { col, row, sizeX, sizeY } = widget.options.position;
      return [widget.id, { col, row, sizeX, sizeY }];
    })
  ) as Record<number, { col: number; row: number; sizeX: number; sizeY: number }>;
}

// ---------- the dashboard page ----------

export const grid = (page: Page) => page.locator(".react-grid-layout");
export const gridItems = (page: Page) => page.locator(".react-grid-item:not(.react-grid-placeholder)");
export const widgetById = (page: Page, id: number) => page.locator(`[data-widgetid="${id}"]`);
/** The widget showing the query (and, when given, the visualization) with this name. */
export function widgetByTitle(page: Page, queryName: string, visualizationName?: string): Locator {
  const widgets = gridItems(page).filter({ has: page.locator(".th-title", { hasText: queryName }) });
  return visualizationName
    ? widgets.filter({ has: page.locator(".th-title", { hasText: visualizationName }) })
    : widgets;
}
export const dashboardTitle = (page: Page) => page.locator(".dashboard-header h3");
export const dashboardParameters = (page: Page) => byTest(page, "DashboardParameters");
export const dashboardFilters = (page: Page) => byTest(page, "DashboardFilters");
export const refreshButton = (page: Page) => page.locator(".dashboard-control .ant-btn-group button").first();
export const refreshIntervalButton = (page: Page) => page.locator(".dashboard-control .ant-btn-group .icon-button");
export const publishButton = (page: Page) => page.locator(".dashboard-control button", { hasText: "Publish" });
export const fullscreenButton = (page: Page) => page.locator('[aria-label="Toggle fullscreen display"]');
export const openMenu = (page: Page) => page.locator(".ant-dropdown:not(.ant-dropdown-hidden)");
export const confirmDialog = (page: Page) => page.locator(".ant-modal-confirm");
export const NOT_FOUND = "It seems like the page you're looking for cannot be found.";

/** Waits until every widget on the page has finished loading or refreshing. */
export async function settled(page: Page, timeout = 45_000) {
  // The grid's wrapper is there as soon as the dashboard itself has loaded (also when it has no widgets)
  await expect(page.locator(".dashboard-wrapper")).toBeAttached({ timeout });
  // Two reads in a row: the grid is empty for a moment while it is (re)built, e.g. when edit mode starts
  const busy = page.locator('.widget-wrapper .spinner-container, .widget-wrapper .tile[data-refreshing="true"]');
  let quietBefore = false;
  await expect(async () => {
    const quiet = (await busy.count()) === 0;
    const settledNow = quiet && quietBefore;
    quietBefore = quiet;
    expect(settledNow, "no widget is loading or refreshing").toBe(true);
  }).toPass({ intervals: [200, 200, 300, 300, 500], timeout });
}

export async function openDashboard(page: Page, id: number, query = "") {
  await page.goto(`/dashboards/${id}${query}`);
  await expect(dashboardTitle(page)).toBeVisible();
  await settled(page);
}

/** Creates a dashboard through Create > New Dashboard; the page ends up on the new dashboard in edit mode. */
export async function createDashboard(page: Page, name: string): Promise<number> {
  await page.goto("/dashboards");
  await byTest(page, "CreateButton").click();
  await byTest(page, "CreateDashboardMenuItem").click();
  await byTest(page, "CreateDashboardDialog").locator("input").fill(name);
  await byTest(page, "DashboardSaveButton").click();
  await page.waitForURL(/\/dashboards\/\d+-/);
  await expect(doneEditingButton(page)).toBeVisible();
  return Number(page.url().match(/\/dashboards\/(\d+)/)?.[1]);
}

export const doneEditingButton = (page: Page) => page.getByRole("button", { name: "Done Editing" });

export async function enterEditMode(page: Page) {
  await byTest(page, "DashboardMoreButton").click();
  await byTest(page, "DashboardMoreButtonMenu").getByText("Edit", { exact: true }).click();
  await expect(doneEditingButton(page)).toBeVisible();
  await expect(page.locator(".dashboard-wrapper.editing-mode")).toBeVisible();
}

/** Leaves edit mode once the layout has been saved. */
export async function doneEditing(page: Page) {
  await expect(page.locator(".save-status")).toHaveText("Saved", { timeout: 20_000 });
  await doneEditingButton(page).click();
  await expect(byTest(page, "DashboardMoreButton")).toBeVisible();
  await expect(page.locator(".dashboard-wrapper.preview-mode")).toBeVisible();
}

/**
 * Adds a widget through the Add Widget dialog: searches the query by name, optionally picks a visualization and
 * lets `beforeAdd` change the parameter mappings. Returns the id of the new widget.
 */
export async function addWidget(
  page: Page,
  queryName: string,
  visualizationName?: string,
  beforeAdd?: (dialog: Locator) => Promise<void>
): Promise<number> {
  // A widget added while another one is still loading does not show up until the page is reloaded (see
  // "a widget added while another widget is loading" in create-and-add-widgets.spec.ts), so wait like a person would
  await settled(page);
  await byTest(page, "AddWidgetButton").click();
  const dialog = page.locator(".ant-modal").filter({ has: byTest(page, "AddWidgetDialog") });
  await dialog.getByPlaceholder("Search a query by name").fill(queryName);
  await dialog.locator(".query-selector-result").filter({ hasText: queryName }).first().click();
  await expect(dialog.getByText("Choose Visualization")).toBeVisible();
  if (visualizationName) {
    await dialog.locator(".form-group .ant-select").first().click();
    await selectOptions(page).filter({ hasText: visualizationName }).first().click();
  }
  if (beforeAdd) {
    await beforeAdd(dialog);
  }
  const created = page.waitForResponse((r) => /\/api\/widgets$/.test(r.url()) && r.request().method() === "POST");
  await dialog.locator(".ant-modal-footer button.ant-btn-primary").click();
  const { id } = await (await created).json();
  await expect(dialog).toBeHidden();
  await expect(widgetById(page, id)).toBeVisible();
  return id;
}

export const mappingPopover = (page: Page) =>
  page.locator('.ant-popover:not(.ant-popover-hidden) [data-test="EditParamMappingPopover"]');

/** Rows of the parameter mapping table in the Add Widget / Edit Parameters dialog, as texts. */
export async function mappingRows(page: Page): Promise<string[]> {
  const rows = await page.locator(".parameters-mapping-list tbody tr.ant-table-row").allInnerTexts();
  return rows.map((row) => row.replace(/\s+/g, " ").trim());
}

/** Types a value into a parameter input inside `scope` (the dashboard parameter bar or a widget). */
export async function typeParameter(page: Page, scope: Locator | Page, name: string, value: string | number) {
  await byTest(scope, `ParameterName-${name}`).locator("input").first().click();
  await retype(page, String(value));
}

export const applyButton = (scope: Locator | Page) => byTest(scope, "ParameterApplyButton");

/** Sets one dashboard parameter and applies it. */
export async function applyDashboardParameter(page: Page, name: string, value: string | number) {
  await typeParameter(page, dashboardParameters(page), name, value);
  await applyButton(dashboardParameters(page)).click();
  await settled(page);
}

/** Values of the dashboard parameters, in the order shown: `[["min_qty", "1"], ...]`. */
export async function shownParameters(scope: Locator | Page): Promise<[string, string][]> {
  return scope.locator('[data-test^="ParameterName-"]').evaluateAll((elements) =>
    elements.map((element) => {
      const name = (element.getAttribute("data-test") || "").replace("ParameterName-", "");
      const input = element.querySelector("input");
      return [name, input ? input.value : ""] as [string, string];
    })
  );
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding boxes of all widgets relative to the grid, keyed by widget id. */
export async function boxes(page: Page): Promise<Record<string, Box>> {
  return page.evaluate(() => {
    const result: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const gridElement = document.querySelector(".react-grid-layout");
    if (!gridElement) {
      return result;
    }
    const gridRect = gridElement.getBoundingClientRect();
    gridElement.querySelectorAll(".react-grid-item:not(.react-grid-placeholder)").forEach((item) => {
      const rect = item.getBoundingClientRect();
      result[item.getAttribute("data-widgetid") || ""] = {
        x: Math.round(rect.x - gridRect.x),
        y: Math.round(rect.y - gridRect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      };
    });
    return result;
  });
}

/** Pairs of widgets whose boxes overlap (there must be none). */
export function overlaps(all: Record<string, Box>): string[] {
  const ids = Object.keys(all);
  const found: string[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = all[ids[i]];
      const b = all[ids[j]];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) {
        found.push(`${ids[i]}x${ids[j]}`);
      }
    }
  }
  return found;
}

/** Waits until the widgets stopped moving (the grid animates position changes) and returns their boxes. */
export async function stableBoxes(page: Page): Promise<Record<string, Box>> {
  let previous = "";
  let current: Record<string, Box> = {};
  await expect(async () => {
    current = await boxes(page);
    expect(Object.keys(current).length, "widgets on the page").toBeGreaterThan(0);
    const serialized = JSON.stringify(current);
    const same = serialized === previous;
    previous = serialized;
    expect(same, "widget boxes are the same in two consecutive reads").toBe(true);
  }).toPass({ intervals: [250, 250, 400, 400, 600], timeout: 15_000 });
  return current;
}

/** The box a saved position must have in a grid of this width: 12 columns, 15 px margins, 50 px rows. */
export function expectedBox(position: Position, gridWidth: number): Box {
  const margin = 15;
  const column = (gridWidth - margin * 13) / 12;
  return {
    x: Math.round(margin + position.col * (column + margin)),
    y: margin + position.row * 50,
    w: Math.round(position.sizeX * column + (position.sizeX - 1) * margin),
    h: position.sizeY * 50 - margin,
  };
}

export function expectBoxClose(actual: Box, expected: Box, tolerance = 2) {
  for (const key of ["x", "y", "w", "h"] as const) {
    expect(
      Math.abs(actual[key] - expected[key]),
      `${key}: ${actual[key]} is about ${expected[key]}`
    ).toBeLessThanOrEqual(tolerance);
  }
}

/** x and (rounded) y values of the traces Plotly drew in a widget. */
export async function plotData(widget: Locator): Promise<{ x: string[]; y: number[] }[]> {
  return widget.evaluate((element) => {
    const plot = element.querySelector(".js-plotly-plot") as unknown as {
      data?: { x?: unknown[]; y?: number[]; labels?: unknown[]; values?: number[] }[];
    } | null;
    return ((plot && plot.data) || []).map((trace) => ({
      x: (trace.x || trace.labels || []).map(String),
      y: (trace.y || trace.values || []).map((value) => Math.round(value)),
    }));
  });
}

/** Rows of the table in a widget, as arrays of cell texts (without the empty filler cell that ends each row). */
export async function widgetRows(widget: Locator): Promise<string[][]> {
  return widget.locator("tbody tr.ant-table-row").evaluateAll((rows) =>
    rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td")).map((cell) => (cell.textContent || "").trim());
      return cells[cells.length - 1] === "" ? cells.slice(0, -1) : cells;
    })
  );
}

export const counterValue = (widget: Locator) => widget.locator(".counter-visualization-value");
export const widgetError = (widget: Locator) => widget.locator(".alert-danger");

/** Opens the "..." menu of a widget and returns the menu. */
export async function openWidgetMenu(page: Page, widget: Locator): Promise<Locator> {
  await widget.hover();
  await byTest(widget, "WidgetDropdownButton").click();
  const menu = byTest(page, "WidgetDropdownButtonMenu").locator("visible=true");
  await expect(menu).toBeVisible();
  return menu;
}

/** The primary (or dangerous) button of the open confirmation dialog. */
export const confirmButton = (page: Page) =>
  confirmDialog(page).locator(".ant-btn-dangerous, .ant-btn-primary").first();

/** Opens the share dialog of the dashboard on the page. */
export async function openShareDialog(page: Page) {
  await byTest(page, "OpenShareForm").click();
  const dialog = page.locator(".ant-modal").filter({ hasText: "Share Dashboard" });
  await expect(dialog).toBeVisible();
  return {
    dialog,
    toggle: byTest(dialog, "PublicAccessEnabled"),
    address: byTest(dialog, "SecretAddress"),
    alert: dialog.locator(".ant-alert"),
    close: async () => {
      await dialog.locator(".ant-modal-close").click();
      await expect(dialog).toBeHidden();
    },
  };
}

/** Turns public access on in the share dialog of the dashboard on the page and returns the secret address. */
export async function enableSharing(page: Page): Promise<string> {
  const share = await openShareDialog(page);
  await expect(share.toggle).toHaveAttribute("aria-checked", "false");
  await share.toggle.click();
  await expect(share.toggle).toHaveAttribute("aria-checked", "true");
  const url = await share.address.inputValue();
  await share.close();
  return url;
}

/** Distance between the left edges of two neighbouring grid columns. */
export async function columnStep(page: Page): Promise<number> {
  const box = await grid(page).boundingBox();
  return ((box?.width || 0) - 15 * 13) / 12 + 15;
}
