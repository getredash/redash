import { expect, type Locator, type Page } from "@playwright/test";
import type { RedashApi } from "../../visual-tests/api";
import { MOD } from "./env";

/** Element by its `data-test` attribute. */
export function byTest(scope: Page | Locator, name: string): Locator {
  return scope.locator(`[data-test="${name}"]`);
}

/** The notification (toast) that is currently shown, e.g. `await expect(toast(page)).toContainText("Saved")`. */
export function toast(page: Page): Locator {
  return page.locator(".ant-notification-notice, .ant-message-notice");
}

/** Closes the open notifications so they don't cover buttons in the corner. */
export async function dismissToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>(".ant-notification-notice-close").forEach((button) => {
      button.click();
    });
  });
  await expect(page.locator(".ant-notification-notice")).toHaveCount(0);
}

/** The options of the antd Select dropdown that is currently open. */
export function selectOptions(page: Page): Locator {
  return page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option");
}

/** Opens an antd Select and picks the option with the given text. */
export async function pick(page: Page, select: Locator, option: string | RegExp) {
  await select.locator(".ant-select-selector").first().click();
  await selectOptions(page).filter({ hasText: option }).first().click();
}

/** Types into the field that has focus, replacing what was there. */
export async function retype(page: Page, text: string) {
  await page.keyboard.press(`${MOD}+A`);
  await page.keyboard.type(text);
}

// ---------- query editor ----------

/** Replaces the SQL in the query editor, the way pasting would (no autocomplete, no auto-indent). */
export async function setSql(page: Page, sql: string) {
  await page.locator('[data-test="QueryEditor"] .ace_content').click();
  await page.keyboard.press(`${MOD}+A`);
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  // The editor reports changes to the page after a 100 ms debounce; see known issue "execute-runs-stale-text"
  await page.waitForTimeout(300);
}

/** The text in the query editor. */
export async function getSql(page: Page): Promise<string> {
  const lines = await page.locator('[data-test="QueryEditor"] .ace_line').allTextContents();
  return lines.join("\n");
}

/** Clicks Execute and waits until the run is over. Returns the error text when the query failed. */
export async function execute(page: Page, timeout = 60_000): Promise<{ error: string | null }> {
  const button = byTest(page, "ExecuteButton");
  const status = byTest(page, "QueryExecutionStatus");
  await button.click();
  await expect(async () => {
    await expect(button).toBeEnabled();
    const text = (await status.count()) > 0 ? await status.innerText() : "";
    expect(text).not.toMatch(/Executing|queue|Loading|Cancelling/i);
  }).toPass({ timeout });
  const text = (await status.count()) > 0 ? await status.innerText() : "";
  return { error: /Error/i.test(text) ? text.replace(/\s+/g, " ").trim() : null };
}

/** Selects the data source in the query editor. */
export async function selectDataSource(page: Page, name: string) {
  const select = byTest(page, "SelectDataSource");
  if (!(await select.innerText()).includes(name)) {
    await pick(page, select, name);
  }
}

/**
 * Creates a query in the query editor, through the UI: picks the data source, types the SQL, saves, names it and
 * (by default) runs it. Use `createQueryViaApi` when creating the query is not what the test is about.
 */
export async function createQuery(
  page: Page,
  options: { name: string; dataSource: string; sql: string; run?: boolean }
): Promise<number> {
  await page.goto("/queries/new");
  await page.locator('[data-test="QueryEditor"] .ace_content').waitFor();
  await selectDataSource(page, options.dataSource);
  await setSql(page, options.sql);
  await byTest(page, "SaveButton").click();
  await page.waitForURL(/\/queries\/\d+\/source/);
  const id = Number(page.url().match(/\/queries\/(\d+)/)?.[1]);
  await renameQuery(page, options.name);
  if (options.run !== false) {
    const { error } = await execute(page);
    expect(error, `query "${options.name}" runs without an error`).toBeNull();
  }
  return id;
}

/** Renames the query on the query page by editing its title in place. */
export async function renameQuery(page: Page, name: string) {
  const saved = page.waitForResponse((r) => /\/api\/queries\/\d+$/.test(r.url()) && r.request().method() === "POST");
  await page.locator(".query-page-header .edit-in-place, .page-header--query .edit-in-place").first().click();
  await retype(page, name);
  await page.keyboard.press("Enter");
  await saved;
}

export interface QuerySeed {
  name: string;
  dataSourceId: number;
  sql: string;
  options?: Record<string, unknown>;
  /** Run it and wait for the result (default true), so pages show cached results. */
  run?: boolean;
  /** Leave it unpublished (default: published). */
  draft?: boolean;
  tags?: string[];
  description?: string;
}

/** Creates (and by default runs and publishes) a query through the API, for tests that only need it to exist. */
export async function createQueryViaApi(api: RedashApi, seed: QuerySeed): Promise<{ id: number; api_key: string }> {
  const query = await api.post("/api/queries", {
    name: seed.name,
    query: seed.sql,
    data_source_id: seed.dataSourceId,
    options: seed.options || {},
    description: seed.description,
    tags: seed.tags,
  });
  if (!seed.draft) {
    await api.post(`/api/queries/${query.id}`, { is_draft: false });
  }
  if (seed.run !== false) {
    const parameters = Object.fromEntries(
      ((seed.options?.parameters as { name: string; value: unknown }[]) || []).map((p) => [p.name, p.value])
    );
    const execution = await api.post(`/api/queries/${query.id}/results`, { max_age: 0, parameters });
    await api.waitForExecution(execution, seed.name);
  }
  return query;
}

/** Adds a visualization to a query through the API. */
export async function createVisualizationViaApi(
  api: RedashApi,
  queryId: number,
  visualization: { type: string; name: string; options?: Record<string, unknown> }
): Promise<number> {
  const { id } = await api.post("/api/visualizations", {
    query_id: queryId,
    type: visualization.type,
    name: visualization.name,
    description: "",
    options: visualization.options || {},
  });
  return id;
}

/** Rows of the result table on the page, as arrays of cell texts. */
export async function tableRows(scope: Page | Locator): Promise<string[][]> {
  const rows = byTest(scope, "TableVisualization").locator("tbody tr.ant-table-row");
  return rows.evaluateAll((trs) =>
    trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim()))
  );
}

/** Drags with the real mouse from one point to another in small steps, as a hand would. */
export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: { steps?: number; holdBeforeRelease?: number } = {}
) {
  const steps = options.steps ?? 12;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
    await page.waitForTimeout(30);
  }
  // React 18 renders the last move asynchronously; releasing in the same frame would drop it
  await page.waitForTimeout(options.holdBeforeRelease ?? 200);
  await page.mouse.up();
}

/** The center of an element, in page coordinates. */
export async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("element is not visible");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
