import zlib from "zlib";
import type { Locator, Page, Request } from "@playwright/test";
import { MOD } from "../../support/env";
import { expect, type RedashApi } from "../../support/fixtures";
import { byTest, selectDataSource } from "../../support/ui";

export { MOD };

/** A public CSV with a date column ("Date added"), for the `parse_dates` option of the CSV data source. */
export const PUBLIC_CSV_WITH_DATES_URL =
  process.env.E2E_PUBLIC_CSV_DATES_URL ||
  "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv";

export const editor = (page: Page) => page.locator('[data-test="QueryEditor"] .ace_content');
export const executeButton = (page: Page) => page.locator('.query-editor-controls [data-test="ExecuteButton"]');
export const saveButton = (page: Page) => byTest(page, "SaveButton");
export const executionStatus = (page: Page) => byTest(page, "QueryExecutionStatus");
export const executionMetadata = (page: Page) => page.locator(".query-execution-metadata");
export const autoLimit = (page: Page) => page.locator(".query-editor-controls-checkbox");
export const schemaTables = (page: Page) => page.locator(".schema-list-item .table-name");
export const schemaColumns = (page: Page) => page.locator(".table-open-item");
export const autocompletePopup = (page: Page) => page.locator(".ace_autocomplete");
export const autocompleteEntries = (page: Page) => page.locator(".ace_autocomplete .ace_line");
export const openMenuItems = (page: Page) =>
  page.locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item");

/** Texts of the elements, with whitespace collapsed. */
export async function texts(locator: Locator): Promise<string[]> {
  return (await locator.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
}

/** Opens an empty query editor on the given data source; waits for the schema when the source has one. */
export async function openNewQuery(page: Page, dataSource: string, options: { schema?: boolean } = {}) {
  await page.goto("/queries/new");
  await editor(page).waitFor();
  await selectDataSource(page, dataSource);
  await expect(byTest(page, "SelectDataSource")).toContainText(dataSource);
  if (options.schema !== false) {
    await expect(schemaTables(page).first()).toBeVisible({ timeout: 60_000 });
  }
}

/** Opens the editor of a saved query. */
export async function openQuerySource(page: Page, id: number) {
  await page.goto(`/queries/${id}/source`);
  await editor(page).waitFor();
}

/** Puts the cursor at the end of the editor's text. */
export async function focusEditorEnd(page: Page) {
  await editor(page).click();
  await page.keyboard.press(`${MOD}+ArrowDown`);
  await page.keyboard.press("End");
}

/** Empties the editor and leaves the focus in it. */
export async function clearEditor(page: Page) {
  await editor(page).click();
  await page.keyboard.press(`${MOD}+A`);
  await page.keyboard.press("Delete");
}

/**
 * Types into the editor with the keyboard, key by key, as a person would (the autocomplete popup follows the
 * typing and may still be open afterwards).
 *
 * The timing is deliberate. The editor loses or misplaces characters when a key lands about 100 ms after the
 * previous one (see the test "typing at about ten keys a second keeps every character"), so this types clearly
 * faster than that, and first lets the page take in whatever was typed or inserted before.
 */
export async function typeKeys(page: Page, text: string) {
  await settle(page);
  await page.keyboard.type(text, { delay: 25 });
}

/** Empties the editor and types one line into it; see `typeKeys`. Use `setSql` (paste) when typing is not the point. */
export async function typeInEditor(page: Page, text: string) {
  await clearEditor(page);
  await typeKeys(page, text);
  await waitForEditorText(page, text);
}

/** Waits until the editor shows exactly this text, and the page has taken it in (see `settle`). */
export async function waitForEditorText(page: Page, text: string) {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  await expect
    .poll(async () =>
      normalize((await page.locator('[data-test="QueryEditor"] .ace_line').allTextContents()).join(" "))
    )
    .toBe(normalize(text));
  await settle(page);
}

/**
 * The editor hands its text to the page after a 100 ms debounce (known issue "execute-runs-stale-text"), so a real
 * pause is needed between the last key and Execute/Save, or more typing. This is the one fixed wait of this area.
 */
export async function settle(page: Page) {
  await page.waitForTimeout(300);
}

/** Waits until no run is in progress on the page. */
export async function waitUntilRunIsOver(page: Page, timeout = 60_000) {
  await expect(async () => {
    const status = executionStatus(page);
    const text = (await status.count()) > 0 ? await status.first().innerText() : "";
    expect(text).not.toMatch(/Executing|queue|Loading|Cancelling/i);
  }).toPass({ timeout });
}

export interface ResultData {
  query: string;
  runtime: number;
  data: { columns: { name: string; type: string | null }[]; rows: Record<string, unknown>[] };
}

export interface Run {
  /** Body of the execute request (`POST /api/query_results` or `POST /api/queries/<id>/results`). */
  sent: { query?: string; apply_auto_limit?: boolean; data_source_id?: number; max_age?: number };
  /** Id of the job the server started. */
  jobId: string | undefined;
  /** The result the page loaded, or null when the query failed. */
  result: ResultData | null;
  /** Text of the error box, or null. */
  error: string | null;
}

const isExecuteRequest = (request: Request) =>
  request.method() === "POST" && /\/api\/(query_results|queries\/\d+\/results)$/.test(request.url());

/**
 * Starts a run with the given gesture (default: a click on Execute), waits until it is over, and returns what
 * was sent to the server and what came back.
 */
export async function run(page: Page, trigger?: () => Promise<unknown>, timeout = 60_000): Promise<Run> {
  let result: ResultData | null = null;
  const onResponse = async (response: import("@playwright/test").Response) => {
    if (/\/api\/query_results\/\d+$/.test(response.url()) && response.status() === 200) {
      try {
        result = (await response.json()).query_result;
      } catch {
        // the page navigated away; not our result
      }
    }
  };
  page.on("response", onResponse);
  try {
    const responsePromise = page.waitForResponse((response) => isExecuteRequest(response.request()), { timeout });
    await (trigger ? trigger() : executeButton(page).click());
    const response = await responsePromise;
    const sent = response.request().postDataJSON();
    const body = await response.json().catch(() => ({}));
    await waitUntilRunIsOver(page, timeout);
    const status = executionStatus(page);
    const text = (await status.count()) > 0 ? await status.first().innerText() : "";
    const error = /Error/i.test(text) ? text.replace(/\s+/g, " ").trim() : null;
    if (!error) {
      await expect.poll(() => result, "the page loaded the result of the run").not.toBeNull();
    }
    return { sent, jobId: body.job?.id, result: error ? null : result, error };
  } finally {
    page.off("response", onResponse);
  }
}

/** Rows of the result table on the page, as arrays of cell texts (without the table's empty spacer column). */
export async function resultRows(scope: Page | Locator): Promise<string[][]> {
  const rows = byTest(scope, "TableVisualization").first().locator("tbody tr.ant-table-row");
  return rows.evaluateAll((trs) =>
    trs.map((tr) =>
      Array.from(tr.querySelectorAll("td:not(.table-visualization-spacer)")).map((td) => (td.textContent || "").trim())
    )
  );
}

/** What the autocomplete popup offers, as "<name>, <kind or type>". */
export async function autocompleteOffers(page: Page): Promise<string[]> {
  return autocompleteEntries(page).evaluateAll((entries) =>
    entries.map((entry) => entry.getAttribute("aria-label") || "")
  );
}

/** Opens the "..." menu in the header of the query page and clicks an entry. */
export async function headerMenu(page: Page, item: string | RegExp) {
  await byTest(page, "QueryPageHeaderMoreButton").click();
  await openMenuItems(page).filter({ hasText: item }).first().click();
}

/** Runs SQL through the API (not the page) and returns the rows; for checking the state of the database. */
export async function sqlViaApi(api: RedashApi, dataSourceId: number, sql: string): Promise<Record<string, any>[]> {
  const execution = await api.post("/api/query_results", { data_source_id: dataSourceId, query: sql, max_age: 0 });
  let job = execution.job;
  if (!job) {
    return execution.query_result.data.rows;
  }
  const deadline = Date.now() + 60_000;
  while (job.status < 3) {
    if (Date.now() > deadline) {
      throw new Error(`check query did not finish: ${sql}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    job = (await api.get(`/api/jobs/${job.id}`)).job;
  }
  if (job.status !== 3) {
    throw new Error(`check query failed: ${JSON.stringify(job.error)}`);
  }
  const resultId = job.query_result_id ?? job.result;
  return (await api.get(`/api/query_results/${resultId}`)).query_result.data.rows;
}

// ---------- downloaded files ----------

/** Parses CSV/TSV text (RFC 4180 quoting) into rows of cells. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Reads a zip archive (as an xlsx file is) from its central directory; returns the files by name. */
export function unzip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) {
    throw new Error("not a zip file: no end-of-central-directory record");
  }
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("corrupt zip central directory");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    files.set(name, method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

export interface SheetCell {
  /** Cell type attribute: "n"/undefined number, "b" boolean, "s" shared string, "inlineStr"/"str" text. */
  type: string | undefined;
  value: string;
}

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");

/** Rows of the first worksheet of an xlsx file, cells by column letter. Shared strings are resolved. */
export function readXlsxSheet(buffer: Buffer): Record<string, SheetCell>[] {
  const files = unzip(buffer);
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) {
    throw new Error(`no xl/worksheets/sheet1.xml in the workbook, only: ${[...files.keys()].join(", ")}`);
  }
  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8") || "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
    decodeXml([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))
  );
  const rows: Record<string, SheetCell>[] = [];
  for (const rowMatch of sheet.toString("utf8").matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Record<string, SheetCell> = {};
    for (const cell of rowMatch[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const column = /r="([A-Z]+)\d+"/.exec(cell[1])?.[1] || "?";
      const type = /t="(\w+)"/.exec(cell[1])?.[1];
      const body = cell[2] || "";
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] ?? "";
      row[column] = { type, value: type === "s" ? shared[Number(raw)] : decodeXml(raw) };
    }
    rows.push(row);
  }
  return rows;
}
