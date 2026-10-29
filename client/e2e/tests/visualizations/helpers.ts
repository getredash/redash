import type { Locator, Page } from "@playwright/test";
import { MOD } from "../../support/env";
import { expect, type RedashApi } from "../../support/fixtures";
import { byTest, createQueryViaApi } from "../../support/ui";

/** Test timeout for this area: its tests build visualizations step by step, each step a round trip or a redraw. */
export const SLOW_INSTANCE_TIMEOUT = 180_000;

export interface SavedVisualization {
  id: number;
  type: string;
  name: string;
  options: Record<string, any>;
}

export type Row = Record<string, string | number | boolean | null>;

/** A published query on the PostgreSQL demo data that has been run, so its page shows results at once. */
export async function seedQuery(api: RedashApi, dataSourceId: number, name: string, sql: string): Promise<number> {
  const query = await createQueryViaApi(api, { name, dataSourceId, sql });
  return query.id;
}

/** The rows of the query's latest result, to compute what a visualization must show. */
export async function resultRows(api: RedashApi, queryId: number): Promise<Row[]> {
  const query = await api.get(`/api/queries/${queryId}`);
  const result = await api.get(`/api/query_results/${query.latest_query_data_id}`);
  return result.query_result.data.rows;
}

/** The visualizations of a query as the server has them. */
export async function savedVisualizations(api: RedashApi, queryId: number): Promise<SavedVisualization[]> {
  return (await api.get(`/api/queries/${queryId}`)).visualizations;
}

export async function savedVisualization(api: RedashApi, queryId: number, id: number): Promise<SavedVisualization> {
  const found = (await savedVisualizations(api, queryId)).find((visualization) => visualization.id === id);
  if (!found) {
    throw new Error(`query ${queryId} has no visualization ${id}`);
  }
  return found;
}

// ---------- query page ----------

export const tabs = (page: Page) => byTest(page, "QueryPageVisualizationTabs");

/** The pane of the visualization tab that is open on the query page. */
export const activePane = (page: Page) => tabs(page).locator(".ant-tabs-tabpane-active");

/** Opens the query's editor ("source") page. */
export async function openSourcePage(page: Page, queryId: number) {
  await page.goto(`/queries/${queryId}/source`);
  await expect(tabs(page)).toBeVisible({ timeout: 30_000 });
}

/** Opens the query's view page, on the tab of the given visualization. */
export async function openViewPage(page: Page, queryId: number, visualizationId?: number) {
  await page.goto(`/queries/${queryId}${visualizationId ? `#${visualizationId}` : ""}`);
  await expect(tabs(page)).toBeVisible({ timeout: 30_000 });
  if (visualizationId) {
    await expect(tabs(page).locator(".ant-tabs-tab-active")).toHaveCount(1);
    await expect(
      tabs(page).locator(`.ant-tabs-tab-active [data-test="QueryPageVisualizationTab${visualizationId}"]`)
    ).toHaveCount(1);
  }
}

/** The tab of a visualization in the tab bar (not its copy in the overflow menu). */
export function visualizationTab(page: Page, id: number): Locator {
  return tabs(page).locator(`.ant-tabs-nav-list [data-test="QueryPageVisualizationTab${id}"]`);
}

/**
 * Clicks a visualization tab. When the tab bar overflows and the tab is scrolled out of view, picks it from the
 * "..." menu, as a user would.
 */
export async function clickVisualizationTab(page: Page, id: number): Promise<"tab" | "menu"> {
  const tab = visualizationTab(page, id);
  const active = tabs(page).locator(`.ant-tabs-tab-active [data-test="QueryPageVisualizationTab${id}"]`);
  if ((await active.count()) > 0) {
    return "tab";
  }
  let used: "tab" | "menu" = "tab";
  // The tab bar moves while the page is still drawing (tabs get their content, the bar scrolls): a click that
  // lands on a moving tab is lost, so look again and click again until the tab is the active one
  await expect(async () => {
    if ((await active.count()) > 0) {
      return;
    }
    // The part of the tab that is inside the tab bar (the bar scrolls when there are many tabs)
    const visiblePart = await tab.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const wrap = element.closest(".ant-tabs-nav-wrap")?.getBoundingClientRect();
      if (!wrap) {
        return null;
      }
      const left = Math.max(box.left, wrap.left);
      const right = Math.min(box.right, wrap.right);
      return right - left >= 10 ? { x: (left + right) / 2, y: box.top + box.height / 2 } : null;
    });
    if (visiblePart) {
      used = "tab";
      await page.mouse.move(visiblePart.x, visiblePart.y, { steps: 5 });
      await page.mouse.down();
      await page.mouse.up();
    } else {
      const name = (await tab.innerText()).trim();
      const more = tabs(page).locator(".ant-tabs-nav-more").first();
      const item = page
        .locator(".ant-tabs-dropdown:not(.ant-tabs-dropdown-hidden) .ant-tabs-dropdown-menu-item")
        .filter({ hasText: name })
        .first();
      // The menu opens when the mouse comes onto the "..." button: come from elsewhere if it was resting there
      const box = await more.boundingBox();
      await page.mouse.move((box?.x ?? 0) - 200, (box?.y ?? 0) + 150, { steps: 5 });
      await more.hover();
      await expect(item).toBeVisible({ timeout: 2000 });
      await item.click();
      used = "menu";
    }
    await expect(active, "the clicked tab is the active one").toHaveCount(1, { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  return used;
}

// ---------- visualization editor ----------

export const editor = (page: Page) => byTest(page, "VisualizationEditor");
export const preview = (page: Page) => byTest(page, "VisualizationPreview");
export const dialog = (page: Page) => page.locator(".ant-modal").filter({ has: editor(page) });

/** Clicks "New Visualization" and chooses the type (e.g. "TABLE", "COUNTER"). */
export async function newVisualization(page: Page, type: string, name?: string) {
  await byTest(page, "NewVisualization").click();
  await expect(editor(page)).toBeVisible();
  await byTest(page, "VisualizationType").click();
  await byTest(page, `VisualizationType.${type}`).click();
  await expect(byTest(page, `VisualizationType.${type}`)).toBeHidden();
  if (name) {
    await nameVisualization(page, name);
  }
}

export async function nameVisualization(page: Page, name: string) {
  await byTest(page, "VisualizationName").fill(name);
  await expect(byTest(page, "VisualizationName")).toHaveValue(name);
}

/** Opens the editor of the visualization whose tab is open. */
export async function editVisualization(page: Page) {
  await page.getByRole("button", { name: /Edit Visualization/ }).click();
  await expect(editor(page)).toBeVisible();
}

/** Switches the tab of the visualization editor ("General", "Format", ...). */
export async function editorTab(page: Page, key: string) {
  await byTest(page, `VisualizationEditor.Tabs.${key}`).click();
  await expect(editor(page).locator(`.ant-tabs-tab-active [data-test="VisualizationEditor.Tabs.${key}"]`)).toHaveCount(
    1
  );
}

/** Opens the Select with the given `data-test` and clicks the option with the given `data-test`. */
export async function choose(page: Page, select: string, option: string) {
  await byTest(page, select).first().click();
  const item = page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) [data-test="${option}"]`).first();
  await item.click();
  await expect(item).toBeHidden();
}

/** The texts of the options of the Select with the given `data-test` (opens it and closes it again). */
export async function optionTexts(page: Page, select: string): Promise<string[]> {
  await byTest(page, select).first().click();
  const options = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option");
  await expect(options.first()).toBeVisible();
  const texts = (await options.allInnerTexts()).map((text) => text.trim());
  await page.keyboard.press("Escape");
  await expect(options.first()).toBeHidden();
  return texts;
}

/** Replaces the content of an input by typing, the way a user does (so debounced handlers behave as they do). */
export async function typeInto(input: Locator, text: string) {
  await input.click();
  await input.press(`${MOD}+A`);
  await input.press("Delete");
  if (text !== "") {
    await input.pressSequentially(text, { delay: 10 });
  }
}

/**
 * Selects what is in the input and types over it. For number inputs with a minimum: emptying those first would
 * put the minimum in, and the typed digits would be appended to it.
 */
export async function overtype(input: Locator, text: string) {
  await input.click();
  await input.press(`${MOD}+A`);
  await input.pressSequentially(text, { delay: 10 });
}

/** Types into the editor input with the given `data-test`. */
export async function typeIn(page: Page, name: string, text: string) {
  await typeInto(byTest(page, name).first(), text);
}

/** Picks a colour in a ColorPicker by typing its hex code (without #). */
export async function pickColor(page: Page, trigger: string, hex: string) {
  await byTest(page, trigger).click();
  const input = page.locator('.ant-popover:not(.ant-popover-hidden) [data-test="ColorPicker"] input').first();
  await typeInto(input, hex);
  await input.press("Enter");
  await expect(input).toBeHidden();
}

/** Clicks Save in the editor and returns what the server stored. */
export async function saveVisualization(page: Page): Promise<SavedVisualization> {
  const response = page.waitForResponse(
    (r) => /\/api\/visualizations(\/\d+)?$/.test(new URL(r.url()).pathname) && r.request().method() === "POST"
  );
  await dialog(page).locator(".ant-modal-footer .ant-btn-primary").click();
  const saved = (await (await response).json()) as SavedVisualization;
  await expect(editor(page)).toHaveCount(0);
  return saved;
}

/** The collapsible panel of a column in the Table / Details column list. */
export function columnPanel(page: Page, prefix: "Table" | "Details", column: string): Locator {
  return editor(page)
    .locator(".ant-collapse-item")
    .filter({ has: byTest(page, `${prefix}.Column.${column}.Name`) });
}

/**
 * Expands or collapses a column panel (clicking its header beside the name). Right after a drag the list is still
 * settling and a click can miss, so the click is repeated until the panel has changed.
 */
export async function toggleColumn(page: Page, prefix: "Table" | "Details", column: string) {
  const panel = columnPanel(page, prefix, column);
  const isOpen = () => panel.evaluate((element) => element.classList.contains("ant-collapse-item-active"));
  const before = await isOpen();
  await expect(async () => {
    if ((await isOpen()) === before) {
      await panel.locator(".ant-collapse-header").click({ position: { x: 120, y: 10 } });
    }
    await expect.poll(isOpen, { timeout: 1500 }).toBe(!before);
  }).toPass({ timeout: 15_000 });
}

/** The column names in the order the Table / Details editor lists them. */
export function columnOrder(page: Page, prefix: "Table" | "Details"): Promise<string[]> {
  return editor(page)
    .locator(`[data-test^="${prefix}.Column."][data-test$=".Name"]`)
    .evaluateAll((names) => names.map((name) => (name.textContent || "").trim()));
}

// ---------- table ----------

export const table = (scope: Page | Locator) => byTest(scope, "TableVisualization");

/** The header texts of the table, without the empty spacer/search cells. */
export function headers(scope: Page | Locator): Promise<string[]> {
  return table(scope)
    .locator("thead tr:last-child th")
    .evaluateAll((cells) => cells.map((cell) => (cell.textContent || "").trim()).filter((text) => text !== ""));
}

export const bodyRows = (scope: Page | Locator) => table(scope).locator("tbody tr.ant-table-row");

/** The cells of the column with the given header, on the page that is shown. */
export async function columnCells(scope: Page | Locator, header: string): Promise<Locator> {
  const index = await table(scope)
    .locator("thead tr:last-child th")
    .evaluateAll((cells, title) => cells.findIndex((cell) => (cell.textContent || "").trim() === title), header);
  if (index < 0) {
    throw new Error(`the table has no column "${header}"`);
  }
  return bodyRows(scope).locator(`td:nth-child(${index + 1})`);
}

export async function columnTexts(scope: Page | Locator, header: string): Promise<string[]> {
  return (await (await columnCells(scope, header)).allTextContents()).map((text) => text.trim());
}

// ---------- mouse ----------

export interface Point {
  x: number;
  y: number;
}

/**
 * Moves the real mouse to a point, travelling there from where it is. A mouse that jumps instead skips the
 * mouseout of whatever it was over (Leaflet then leaves that shape's tooltip open).
 */
export async function hoverAt(page: Page, point: Point) {
  await page.mouse.move(point.x, point.y, { steps: 20 });
}

/**
 * Drags with the real mouse: press, a short first move (drag libraries start after a few pixels), travel in steps,
 * pause over the target so the library can react, then release. `whileHeld` runs just before the release.
 */
export async function dragTo(
  page: Page,
  from: Point,
  to: Point,
  options: { steps?: number; whileHeld?: () => Promise<void> } = {}
) {
  await page.mouse.move(from.x, from.y, { steps: 5 });
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(from.x + Math.sign(to.x - from.x) * 6, from.y + Math.sign(to.y - from.y) * 6, { steps: 4 });
  await page.waitForTimeout(100);
  await page.mouse.move(to.x, to.y, { steps: options.steps ?? 25 });
  await page.waitForTimeout(300);
  await page.mouse.move(to.x + 2, to.y + 2, { steps: 3 });
  await page.waitForTimeout(200);
  if (options.whileHeld) {
    await options.whileHeld();
  }
  await page.mouse.up();
}

/**
 * The tooltip of the shape or marker under the mouse. Leaflet fades a tooltip out for a moment after the mouse
 * has left its shape, so right after the mouse crossed other shapes there are several: wait until one is left.
 */
export async function mapTooltip(scope: Page | Locator): Promise<Locator> {
  const tooltips = scope.locator(".leaflet-container .leaflet-tooltip");
  await expect(tooltips).toHaveCount(1);
  return tooltips;
}

/** Moves the mouse to the corner of the page, away from anything that reacts to it. */
export async function parkMouse(page: Page) {
  await page.mouse.move(3, 3, { steps: 10 });
}

/**
 * Waits until the shapes or markers of a map have stopped moving: maps are drawn, then fitted to their data and
 * to their pane, and anything hovered in between belongs to a drawing that is replaced a moment later.
 */
export async function waitUntilStill(map: Locator) {
  let previous = "";
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(
          await map.evaluate((container) =>
            Array.from(container.querySelectorAll("path.leaflet-interactive, .leaflet-marker-icon"))
              .slice(0, 40)
              .map((element) => {
                const box = element.getBoundingClientRect();
                return [Math.round(box.x), Math.round(box.y), Math.round(box.width)];
              })
          )
        );
        const still = now === previous && now !== "[]";
        previous = now;
        return still;
      },
      { intervals: [400], timeout: 20_000 }
    )
    .toBe(true);
}

/** The antd tooltip that is shown. */
export const tooltip = (page: Page) => page.locator(".ant-tooltip:not(.ant-tooltip-hidden) .ant-tooltip-inner");

/** Size of an element, rounded. */
export async function sizeOf(locator: Locator): Promise<{ width: number; height: number }> {
  const box = await locator.boundingBox();
  return { width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) };
}

// ---------- maps ----------

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * Answers every map tile request with a transparent image, so maps do not need the internet. Returns the list of
 * requested tile URLs.
 */
export async function stubMapTiles(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(
    (url) => !/^(localhost|127\.0\.0\.1)$/.test(url.hostname) && /\/\d+\/\d+\/\d+(\.\w+)?$/.test(url.pathname),
    (route) => {
      requested.push(route.request().url());
      return route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG });
    }
  );
  return requested;
}

export const leaflet = (scope: Page | Locator) => scope.locator(".leaflet-container").first();

/** The zoom level of a tile map, read from the URLs of the tiles it shows. */
export function tileZoom(scope: Page | Locator): Promise<number | null> {
  return leaflet(scope).evaluate((container) => {
    const zooms = new Set(
      Array.from(container.querySelectorAll<HTMLImageElement>("img.leaflet-tile")).map(
        (tile) => (tile.src.match(/\/(\d+)\/\d+\/\d+(\.\w+)?$/) || [])[1]
      )
    );
    return zooms.size === 1 ? Number([...zooms][0]) : null;
  });
}

/** Markers and clusters that are inside the visible part of the map. */
export function markersInView(scope: Page | Locator) {
  return leaflet(scope).evaluate((container) => {
    const frame = container.getBoundingClientRect();
    const visible = (element: Element) => {
      let box = element.getBoundingClientRect();
      if (!box.width && element.firstElementChild) {
        box = element.firstElementChild.getBoundingClientRect();
      }
      return (
        box.width > 0 &&
        box.right > frame.left &&
        box.left < frame.right &&
        box.bottom > frame.top &&
        box.top < frame.bottom
      );
    };
    return {
      icons: Array.from(container.querySelectorAll(".leaflet-marker-pane > :not(.marker-cluster)")).filter(visible)
        .length,
      circles: Array.from(container.querySelectorAll("path.leaflet-interactive")).filter(visible).length,
      clusters: Array.from(container.querySelectorAll(".marker-cluster"))
        .filter(visible)
        .map((cluster) => (cluster.textContent || "").trim())
        .sort(),
    };
  });
}

/**
 * A point on an element matching the selector that is well inside the map and not covered by anything else, to
 * hover or click it with the mouse.
 */
export async function pointOn(scope: Page | Locator, selector: string, margin = 60): Promise<Point> {
  let point: Point | null = null;
  await expect(async () => {
    point = await leaflet(scope).evaluate(
      (container, [sel, pad]) => {
        const frame = container.getBoundingClientRect();
        const candidates = Array.from(container.querySelectorAll(sel as string))
          .map((element) => ({ element, box: element.getBoundingClientRect() }))
          .filter(
            ({ box }) =>
              box.width > 0 &&
              box.left > frame.left + (pad as number) &&
              box.right < frame.right - (pad as number) &&
              box.top > frame.top + (pad as number) &&
              box.bottom < frame.bottom - (pad as number)
          )
          .sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);
        for (const { element, box } of candidates) {
          for (const [fx, fy] of [
            [0.5, 0.5],
            [0.4, 0.4],
            [0.6, 0.6],
            [0.5, 0.3],
            [0.3, 0.5],
            [0.6, 0.4],
          ]) {
            const x = box.left + box.width * fx;
            const y = box.top + box.height * fy;
            const hit = document.elementFromPoint(x, y);
            if (hit && (hit === element || element.contains(hit))) {
              return { x, y };
            }
          }
        }
        return null;
      },
      [selector, margin] as [string, number]
    );
    expect(point, `an uncovered "${selector}" inside the map`).not.toBeNull();
  }).toPass({ timeout: 15_000 });
  return point as unknown as Point;
}
