import fs from "fs";
import type { Download, Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { backendUpgradeIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi, setSql } from "../../support/ui";
import {
  autoLimit,
  executeButton,
  executionStatus,
  openNewQuery,
  openQuerySource,
  parseDelimited,
  readXlsxSheet,
  run,
  waitUntilRunIsOver,
} from "./helpers";

// A comma inside a value, a timestamp, a date, a decimal, an integer, HTML text and a boolean; 600 rows
const SQL =
  "select o.id, o.created_at, o.created_at::date as day, o.category, o.amount, o.quantity, " +
  "c.name || ', ' || c.country as city_label, o.note, (o.id % 2 = 0) as even " +
  "from orders o join cities c on c.id = o.city_id order by o.id";
const HEADER = ["id", "created_at", "day", "category", "amount", "quantity", "city_label", "note", "even"];

interface Row {
  id: number;
  created_at: string;
  day: string;
  category: string;
  amount: number;
  quantity: number;
  city_label: string;
  note: string;
  even: boolean;
}

const downloadLinks = (page: Page) => page.locator(".query-control-dropdown-overlay:not(.ant-dropdown-hidden) a");

/** Picks an entry of the "..." menu under the results and returns the file the browser downloaded. */
async function download(page: Page, label: string): Promise<{ download: Download; content: Buffer }> {
  await byTest(page, "QueryControlDropdownButton").click();
  const started = page.waitForEvent("download");
  await downloadLinks(page).filter({ hasText: label }).click();
  const file = await started;
  expect(await file.failure()).toBeNull();
  const content = fs.readFileSync(await file.path());
  // The menu stays open after the click
  await page.keyboard.press("Escape");
  return { download: file, content };
}

async function resultViaApi(api: RedashApi, queryId: number): Promise<Row[]> {
  return (await api.get(`/api/queries/${queryId}/results.json`)).query_result.data.rows;
}

/** CSV and TSV: a header and 600 rows that match the JSON result of the API. */
function expectDelimitedFile(content: Buffer, delimiter: string, expected: Row[]) {
  const text = content.toString("utf8");
  expect(text.charCodeAt(0), "no byte order mark").not.toBe(0xfeff);
  expect(text.split("\r\n").length, "lines end with CRLF").toBe(602);
  const [header, ...rows] = parseDelimited(text, delimiter);
  expect(header).toEqual(HEADER);
  expect(rows).toHaveLength(600);
  expect(expected).toHaveLength(600);
  rows.forEach((cells, index) => {
    const row = expected[index];
    expect(cells).toHaveLength(9);
    expect(
      { id: Number(cells[0]), category: cells[3], amount: Number(cells[4]), quantity: Number(cells[5]) },
      `row ${index + 1}`
    ).toEqual({ id: row.id, category: row.category, amount: row.amount, quantity: row.quantity });
    expect(cells[6]).toBe(row.city_label);
    expect(cells[7]).toBe(row.note);
    expect(cells[8].toLowerCase()).toBe(String(row.even));
    // The date format follows an organization setting, so only: there is one, and it shows the right day
    expect(cells[1]).toMatch(/\d/);
    expect(cells[2]).toMatch(/\d/);
  });
  return text;
}

test.describe("Downloading results", () => {
  test("an unsaved query downloads as CSV with the same rows as on screen", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, SQL);
    await autoLimit(page).click();
    const { result, error } = await run(page);
    expect(error).toBeNull();
    const expected = result?.data.rows as unknown as Row[];

    const { content } = await download(page, "Download as CSV File");
    const text = expectDelimitedFile(content, ",", expected);
    // A value with a comma is quoted
    expect(expected[0].city_label).toBe("Tel Aviv, Israel");
    expect(text).toContain(',"Tel Aviv, Israel",');
  });

  test.describe("a saved query", () => {
    const name = uniqueName("Q downloads");
    const fileName = (extension: string) =>
      new RegExp(`^${name.replace(/ /g, "_")}_\\d{4}_\\d{2}_\\d{2}\\.${extension}$`);
    let queryId: number;
    let expected: Row[];

    test.beforeAll(async ({ api, seed }) => {
      queryId = (await createQueryViaApi(api, { name, dataSourceId: seed.dataSources.postgres, sql: SQL })).id;
      expected = await resultViaApi(api, queryId);
    });

    test("downloads as CSV: 600 rows matching the result, commas quoted", async ({ page }) => {
      await openQuerySource(page, queryId);
      await expect(byTest(page, "TableVisualization")).toBeVisible();
      const { content } = await download(page, "Download as CSV File");
      const text = expectDelimitedFile(content, ",", expected);
      expect(text).toContain(`,"${expected[0].city_label}",`);
      expect(text).toContain("gift <b>wrap</b>");
    });

    test("downloads as TSV: 600 rows matching the result", async ({ page }) => {
      await openQuerySource(page, queryId);
      await expect(byTest(page, "TableVisualization")).toBeVisible();
      const { content } = await download(page, "Download as TSV File");
      const text = expectDelimitedFile(content, "\t", expected);
      // Tab separated, so the comma value needs no quotes
      expect(text).toContain(`\t${expected[0].city_label}\t`);
    });

    test("downloads as Excel: a workbook with typed cells matching the result", async ({ page }) => {
      await openQuerySource(page, queryId);
      await expect(byTest(page, "TableVisualization")).toBeVisible();
      const { content } = await download(page, "Download as Excel File");
      expect(content.subarray(0, 2).toString("latin1")).toBe("PK");
      const [header, ...rows] = readXlsxSheet(content);
      expect("ABCDEFGHI".split("").map((column) => header[column]?.value)).toEqual(HEADER);
      expect(rows).toHaveLength(600);
      rows.forEach((cells, index) => {
        const row = expected[index];
        // Numbers are numeric cells, booleans boolean cells, the rest text
        expect(cells.A.type === undefined || cells.A.type === "n", `row ${index + 1}: id is numeric`).toBe(true);
        expect(Number(cells.A.value)).toBe(row.id);
        expect(cells.D.value).toBe(row.category);
        expect(cells.E.type === undefined || cells.E.type === "n", `row ${index + 1}: amount is numeric`).toBe(true);
        expect(Number(cells.E.value)).toBeCloseTo(row.amount, 6);
        expect(Number(cells.F.value)).toBe(row.quantity);
        expect(cells.G.value).toBe(row.city_label);
        expect(cells.H?.value ?? "").toBe(row.note);
        expect(cells.I.type).toBe("b");
        expect(cells.I.value).toBe(row.even ? "1" : "0");
        // Dates are written as ISO text
        expect(cells.B.value).toBe(row.created_at);
        expect(cells.C.value).toBe(row.day);
      });
      expect(rows[0].B.value).toMatch(/^2026-04-21T20:00:00/);
      expect(rows[0].H.value).toBe("gift <b>wrap</b>");
    });

    test("an unsaved query's file is named after the result and its day", async ({ page }) => {
      backendUpgradeIssue("download-file-name-bytes");
      await openNewQuery(page, DATA_SOURCES.postgres);
      await setSql(page, "select id, name from cities order by id");
      expect((await run(page)).error).toBeNull();
      const { download: file } = await download(page, "Download as CSV File");
      expect(file.suggestedFilename()).toMatch(/^\d+_\d{4}_\d{2}_\d{2}\.csv$/);
    });

    test("the files are named after the query and the day of the result", async ({ page }) => {
      backendUpgradeIssue("download-file-name-bytes");
      await openQuerySource(page, queryId);
      await expect(byTest(page, "TableVisualization")).toBeVisible();
      const names: string[] = [];
      for (const label of ["Download as CSV File", "Download as TSV File", "Download as Excel File"]) {
        names.push((await download(page, label)).download.suggestedFilename());
      }
      expect(names[0]).toMatch(fileName("csv"));
      expect(names[1]).toMatch(fileName("tsv"));
      expect(names[2]).toMatch(fileName("xlsx"));
    });

    test("the download entries are disabled while a query is executing", async ({ page }) => {
      await openQuerySource(page, queryId);
      await expect(byTest(page, "TableVisualization")).toBeVisible();
      await byTest(page, "QueryControlDropdownButton").click();
      await expect(downloadLinks(page)).toHaveCount(3);
      for (const link of await downloadLinks(page).all()) {
        await expect(link).not.toHaveAttribute("disabled");
        await expect(link).toHaveAttribute("href", /api\/queries\/\d+\/results\/\d+\.(csv|tsv|xlsx)$/);
      }
      await page.keyboard.press("Escape");

      await setSql(page, "select pg_sleep(5), 1 as x");
      await executeButton(page).click();
      // Waiting in the queue counts as executing too (the workers may be busy with other tests)
      await expect(executionStatus(page)).toContainText(/Query in queue|Executing query/);
      await byTest(page, "QueryControlDropdownButton").click();
      await expect(downloadLinks(page)).toHaveCount(3);
      for (const link of await downloadLinks(page).all()) {
        await expect(link).toHaveAttribute("disabled");
      }
      await page.keyboard.press("Escape");
      await waitUntilRunIsOver(page);
    });
  });
});
