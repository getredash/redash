import type { Locator, Page } from "@playwright/test";
import { DATA_SOURCES, MOD } from "../../support/env";
import { expect, type RedashApi } from "../../support/fixtures";
import { byTest, selectDataSource, selectOptions, setSql } from "../../support/ui";

// ---------- preparing queries through the API ----------

export interface ParameterSeed {
  name: string;
  type?: string;
  title?: string;
  value?: unknown;
  enumOptions?: string;
  queryId?: number;
  regex?: string;
  multiValuesOptions?: { prefix: string; suffix: string; separator: string } | null;
}

/** A parameter definition as the query editor saves it in `options.parameters`. */
export function parameter(seed: ParameterSeed) {
  return { title: seed.name, type: "text", value: null, global: false, locals: [], ...seed };
}

export const quoted = (quote: string) => ({ prefix: quote, suffix: quote, separator: "," });

export interface SavedParameter {
  name: string;
  title: string;
  type: string;
  value: unknown;
  enumOptions?: string;
  queryId?: number;
  regex?: string;
  multiValuesOptions?: { prefix: string; suffix: string; separator: string } | null;
}

/** The parameter definitions the server has for a query. */
export async function savedParameters(api: RedashApi, queryId: number): Promise<SavedParameter[]> {
  return (await api.get(`/api/queries/${queryId}`)).options.parameters || [];
}

/** Runs SQL without parameters through the API and returns its rows: what the database itself answers. */
export async function rowsOf(api: RedashApi, dataSourceId: number, sql: string): Promise<Record<string, unknown>[]> {
  let { job, query_result } = await api.post("/api/query_results", {
    data_source_id: dataSourceId,
    query: sql,
    max_age: 0,
    parameters: {},
  });
  const deadline = Date.now() + 90_000;
  while (!query_result && job && job.status < 3) {
    if (Date.now() > deadline) {
      throw new Error(`the control query did not finish in time: ${sql}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    job = (await api.get(`/api/jobs/${job.id}`)).job;
  }
  if (!query_result) {
    if (job.status !== 3) {
      throw new Error(`the control query failed: ${job.error}`);
    }
    query_result = (await api.get(`/api/query_results/${job.query_result_id ?? job.result}`)).query_result;
  }
  return query_result.data.rows;
}

// ---------- opening pages ----------

/** How this page shows and reads dates: the organization's format at the moment the page loaded. */
export interface Formats {
  date: string;
}

async function gotoAndReadFormats(page: Page, url: string): Promise<Formats> {
  const session = page.waitForResponse((response) => /\/api\/session(\?|$)/.test(response.url()));
  await page.goto(url);
  const { client_config: config } = await (await session).json();
  return { date: config.dateFormat || "YYYY-MM-DD" };
}

/**
 * The page can run the query only once it knows the data source: until the list of data sources has arrived,
 * "Apply Changes" takes the values but silently runs nothing. Execute / Refresh is enabled from then on.
 */
async function waitUntilRunnable(page: Page) {
  await expect(byTest(page, "ExecuteButton").first()).toBeEnabled({ timeout: 30_000 });
}

/** Opens the query editor of a saved query, optionally with a query string of `p_` values. */
export async function openSource(page: Page, queryId: number, search = ""): Promise<Formats> {
  const formats = await gotoAndReadFormats(page, `/queries/${queryId}/source${search}`);
  await page.locator('[data-test="QueryEditor"] .ace_content').waitFor();
  await waitUntilRunnable(page);
  return formats;
}

/** Opens the read-only page of a saved query. */
export async function openView(page: Page, queryId: number, search = ""): Promise<Formats> {
  const formats = await gotoAndReadFormats(page, `/queries/${queryId}${search}`);
  await waitUntilRunnable(page);
  return formats;
}

/** Opens the editor of a new, unsaved PostgreSQL query and puts the SQL in (pass none to type it in the test). */
export async function newQuery(page: Page, sql?: string): Promise<Formats> {
  const formats = await gotoAndReadFormats(page, "/queries/new");
  await page.locator('[data-test="QueryEditor"] .ace_content').waitFor();
  await expect(byTest(page, "SelectDataSource")).not.toHaveClass(/ant-select-(loading|disabled)/);
  await selectDataSource(page, DATA_SOURCES.postgres);
  if (sql) {
    await setSql(page, sql);
    await waitUntilRunnable(page);
  }
  return formats;
}

/** Puts the caret at the end of the SQL in the editor. */
export async function focusEndOfSql(page: Page) {
  await page.locator('[data-test="QueryEditor"] .ace_content').click();
  await page.keyboard.press(`${MOD}+End`);
  await page.keyboard.press("End");
}

/** Saves the query with the Save button and waits until the server has it. */
export async function saveQuery(page: Page): Promise<number> {
  const saved = page.waitForResponse(
    (response) => /\/api\/queries(\/\d+)?$/.test(response.url()) && response.request().method() === "POST"
  );
  await byTest(page, "SaveButton").click();
  expect((await saved).ok(), "the query was saved").toBe(true);
  await page.waitForURL(/\/queries\/\d+\/source/);
  return Number(page.url().match(/\/queries\/(\d+)/)?.[1]);
}

// ---------- dates ----------

/** Writes an ISO date (`2026-03-15`) the way the page shows and expects it, e.g. `15/03/26`. */
export function shown(formats: Formats, iso: string): string {
  const [date, time] = iso.split(" ");
  const [year, month, day] = date.split("-");
  const text = formats.date.replace("YYYY", year).replace("YY", year.slice(2)).replace("MM", month).replace("DD", day);
  return time ? `${text} ${time}` : text;
}

/** The calendar / time popup that is open. */
export function pickerPopup(page: Page): Locator {
  return page.locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)");
}

/** Clicks a value in one of the hour / minute / second columns of the open time picker. */
export async function pickTime(page: Page, column: number, value: string) {
  const cell = pickerPopup(page)
    .locator(".ant-picker-time-panel-column")
    .nth(column)
    .locator("li")
    .filter({ hasText: new RegExp(`^${value}$`) });
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await expect(cell).toHaveClass(/ant-picker-time-panel-cell-selected/);
}

/** Opens the lightning (dynamic value) menu of a date or date-range parameter. */
export async function openDynamicMenu(page: Page, name: string): Promise<Locator> {
  await byTest(param(page, name), "DynamicButton").locator("button").last().click();
  const menu = param(page, name).locator(".dynamic-menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Texts of the open dynamic-value menu, one per entry, with single spaces. */
export async function dynamicMenuItems(menu: Locator): Promise<string[]> {
  const texts = await menu.locator("li.ant-dropdown-menu-item").allInnerTexts();
  return texts.map((text) => text.replace(/\s+/g, " ").trim());
}

// ---------- the parameter bar ----------

/** The block of one parameter (label, cog and input). */
export function param(page: Page, name: string): Locator {
  return byTest(page, `ParameterName-${name}`);
}

/** The wrapper of a parameter's input; it carries `data-dirty` while the value is pending. */
export function valueInput(page: Page, name: string): Locator {
  return byTest(param(page, name), "ParameterValueInput");
}

/** The `<input>` elements of a parameter (one; two for a range), without the search box of a dropdown. */
export function field(page: Page, name: string): Locator {
  return valueInput(page, name).locator("input:not(.ant-select-selection-search-input)");
}

/** Names of the parameters in the order they are shown. */
export async function order(page: Page): Promise<string[]> {
  return page
    .locator('[data-test^="ParameterBlock-"]')
    .evaluateAll((blocks) =>
      blocks.map((block) => (block.getAttribute("data-test") || "").replace("ParameterBlock-", ""))
    );
}

/** Clicks into a text / number parameter and replaces its value by typing. */
export async function typeValue(page: Page, name: string, value: string) {
  await field(page, name).first().click();
  await page.keyboard.press(`${MOD}+A`);
  if (value === "") {
    await page.keyboard.press("Backspace");
  } else {
    await page.keyboard.type(value);
  }
}

/** Types a date into a date parameter and confirms it with Enter. */
export async function typeDate(page: Page, name: string, text: string) {
  await field(page, name).first().click();
  await expect(pickerPopup(page)).toBeVisible();
  await page.keyboard.press(`${MOD}+A`);
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await expect(pickerPopup(page)).toHaveCount(0);
}

/** Types both ends of a range, with Enter after each, as a person would (not faster than the picker follows). */
export async function typeRange(page: Page, name: string, start: string, end: string) {
  const inputs = field(page, name);
  await inputs.first().click();
  await expect(pickerPopup(page)).toBeVisible();
  await page.keyboard.press(`${MOD}+A`);
  await page.keyboard.type(start, { delay: 20 });
  await page.keyboard.press("Enter");
  // Enter moves the picker to the end field; typing before it has done so would go to the start field
  await expect(inputs.nth(1)).toBeFocused();
  await page.keyboard.press(`${MOD}+A`);
  await page.keyboard.type(end, { delay: 20 });
  await page.keyboard.press("Enter");
  await expect(pickerPopup(page)).toHaveCount(0);
}

/** Opens the dropdown of a dropdown parameter. */
export async function openDropdown(page: Page, name: string) {
  await valueInput(page, name).locator(".ant-select-selector").click();
  await expect(selectOptions(page).first()).toBeVisible();
}

/** The option with exactly this text in the dropdown that is open. */
export function option(page: Page, text: string): Locator {
  return selectOptions(page).filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
}

/** Opens a dropdown parameter and clicks the given options; closes the list of a multi-value dropdown. */
export async function choose(page: Page, name: string, ...options: string[]) {
  await openDropdown(page, name);
  for (const text of options) {
    await option(page, text).click();
  }
  if ((await page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").count()) > 0) {
    await page.keyboard.press("Escape");
  }
  await expect(page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")).toHaveCount(0);
}

/** The tags of a multi-value dropdown parameter. */
export function tags(page: Page, name: string): Locator {
  return valueInput(page, name).locator(".ant-select-selection-item");
}

export function applyButton(page: Page): Locator {
  return byTest(page, "ParameterApplyButton");
}

/** Asserts how many parameters are pending: the badge on "Apply Changes"; 0 means the button is hidden. */
export async function expectPending(page: Page, count: number) {
  if (count === 0) {
    await expect(applyButton(page)).toHaveAttribute("data-show", "false");
  } else {
    await expect(applyButton(page)).toHaveAttribute("data-show", "true");
    await expect(applyButton(page).locator(".ant-badge-count")).toHaveAttribute("title", String(count));
  }
}

/**
 * Clicks "Apply Changes" and then a parameter's label, as a person moving on would. The button keeps the focus
 * while it is hidden, so without the click its tooltip would open again over the parameter above it when the
 * button comes back with the next change.
 */
export async function apply(page: Page) {
  await applyButton(page).locator("button").click();
  await expect(applyButton(page)).toHaveAttribute("data-show", "false");
  await page.locator('[data-test^="ParameterName-"] label').first().click();
}

// ---------- results ----------

/** The result table as objects, one per row, keyed by column title. */
export async function resultRows(page: Page): Promise<Record<string, string>[]> {
  const table = byTest(page, "TableVisualization").first();
  if ((await table.count()) === 0) {
    return [];
  }
  return table.evaluate((element) => {
    const text = (cell: Element) => (cell.textContent || "").trim();
    const headers = Array.from(element.querySelectorAll("thead th")).map(text);
    return Array.from(element.querySelectorAll("tbody tr.ant-table-row")).map((tr) =>
      Object.fromEntries(
        Array.from(tr.querySelectorAll("td"))
          .map((td, index) => [headers[index], text(td)])
          .filter(([header]) => header)
      )
    );
  });
}

/** Adds what the page says about the run to a failed result assertion, e.g. the database error. */
async function withRunStatus(page: Page, assertion: () => Promise<void>) {
  try {
    await assertion();
  } catch (error) {
    const status = await byTest(page, "QueryExecutionStatus")
      .innerText({ timeout: 1000 })
      .catch(() => "(none)");
    (error as Error).message += `\nExecution status on the page: ${status.replace(/\s+/g, " ")}`;
    throw error;
  }
}

/** Waits until the result table shows exactly these rows (a run started by the test may still be going). */
export async function expectRows(page: Page, rows: Record<string, string>[], message?: string) {
  await withRunStatus(page, () => expect.poll(() => resultRows(page), { timeout: 45_000, message }).toEqual(rows));
}

/** Waits until the first row of the result has these values (other columns are not looked at). */
export async function expectFirstRow(page: Page, values: Record<string, string>, message?: string) {
  await withRunStatus(page, () =>
    expect.poll(async () => (await resultRows(page))[0] || {}, { timeout: 45_000, message }).toMatchObject(values)
  );
}

/** The message shown instead of a result when a run failed. */
export function runError(page: Page): Locator {
  return byTest(page, "QueryExecutionStatus");
}

// ---------- the parameter settings dialog ----------

export function dialog(page: Page): Locator {
  return page.locator(".ant-modal-wrap:not([style*='display: none']) .ant-modal");
}

/** Opens the settings dialog of a parameter with its cog. */
export async function openSettings(page: Page, name: string) {
  await byTest(page, `ParameterSettings-${name}`).click();
  await expect(byTest(dialog(page), "ParameterTypeSelect")).toBeVisible();
}

/** Picks a type in the dialog that is open. */
export async function chooseType(page: Page, label: string) {
  await byTest(dialog(page), "ParameterTypeSelect").locator(".ant-select-selector").click();
  await option(page, label).click();
  await expect(byTest(dialog(page), "ParameterTypeSelect").locator(".ant-select-selection-item")).toHaveText(label);
}

/**
 * Presses OK in the dialog and waits for it to close. On a saved query without unsaved changes the page then
 * saves the query by itself; this waits for that too, because the page takes the parameters from the answer and
 * a value changed (even applied) in the meantime would be lost.
 */
export async function confirmSettings(page: Page) {
  const autosave = /\/queries\/\d+\/source/.test(page.url())
    ? page.waitForResponse(
        (response) => /\/api\/queries\/\d+$/.test(response.url()) && response.request().method() === "POST"
      )
    : null;
  await byTest(page, "SaveParameterSettings").click();
  await expect(dialog(page)).toHaveCount(0);
  if (autosave) {
    expect((await autosave).ok(), "the query was saved after the parameter was edited").toBe(true);
    await expect(byTest(page, "SaveButton")).not.toHaveClass(/ant-btn-loading/);
  }
}

/** Changes the type of a parameter through its settings dialog; `fill` can set more fields before OK. */
export async function setType(page: Page, name: string, label: string, fill?: () => Promise<void>) {
  await openSettings(page, name);
  await chooseType(page, label);
  if (fill) {
    await fill();
  }
  await confirmSettings(page);
}

/** Types the values of a Dropdown List parameter into the dialog. */
export async function typeDropdownValues(page: Page, values: string[]) {
  await dialog(page).locator("textarea").click();
  await page.keyboard.type(values.join("\n"));
}

/** Ticks "Allow multiple values" and, unless it stays "None", picks the quotation. */
export async function allowMultiple(page: Page, quotation?: "Single Quotation Mark" | "Double Quotation Mark") {
  await byTest(dialog(page), "AllowMultipleValuesCheckbox").click();
  await expect(byTest(dialog(page), "QuotationSelect")).toBeVisible();
  if (quotation) {
    await byTest(dialog(page), "QuotationSelect").locator(".ant-select-selector").click();
    await option(page, quotation).click();
  }
}

/** The help texts under the fields of the dialog. */
export function dialogHelp(page: Page): Locator {
  return dialog(page).locator(".ant-form-item-explain");
}

// ---------- geometry ----------

export interface Box {
  name: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Position of every parameter block and the width of the window. */
export async function blockBoxes(page: Page): Promise<{ boxes: Box[]; windowWidth: number }> {
  return page.evaluate(() => ({
    windowWidth: window.innerWidth,
    boxes: Array.from(document.querySelectorAll('[data-test^="ParameterBlock-"]')).map((block) => {
      const { left, top, right, bottom } = block.getBoundingClientRect();
      return { name: (block.getAttribute("data-test") || "").replace("ParameterBlock-", ""), left, top, right, bottom };
    }),
  }));
}

/** Pairs of blocks that cover each other by more than `slack` pixels. */
export function overlaps(boxes: Box[], slack = 2): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (
        a.left < b.right - slack &&
        b.left < a.right - slack &&
        a.top < b.bottom - slack &&
        b.top < a.bottom - slack
      ) {
        pairs.push(`${a.name}+${b.name}`);
      }
    }
  }
  return pairs;
}
