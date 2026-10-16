import fs from "fs";
import type { Download, Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { backendUpgradeIssue } from "../../support/known-issues";
import {
  addWidgetViaApi,
  Created,
  confirmButton,
  confirmDialog,
  createDashboardViaApi,
  dashboardLevel,
  getDashboard,
  gridItems,
  openDashboard,
  openWidgetMenu,
  type SeededQuery,
  seedQueries,
  widgetById,
} from "./helpers";

/** Names of the files in a zip archive, read from its central directory. */
function zipEntries(file: Buffer): string[] {
  const end = file.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) {
    throw new Error("not a zip archive");
  }
  const count = file.readUInt16LE(end + 10);
  let offset = file.readUInt32LE(end + 16);
  const names: string[] = [];
  for (let entry = 0; entry < count; entry += 1) {
    expect(file.readUInt32LE(offset), "central directory entry signature").toBe(0x02014b50);
    const nameLength = file.readUInt16LE(offset + 28);
    names.push(file.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
    offset += 46 + nameLength + file.readUInt16LE(offset + 30) + file.readUInt16LE(offset + 32);
  }
  return names;
}

test.describe("Dashboard widget menu", () => {
  const created = new Created();
  let tableRows: SeededQuery;
  let byCategory: SeededQuery;

  test.beforeAll(async ({ api, seed }) => {
    tableRows = await seedQueries.tableRows(api, created, seed.dataSources.postgres);
    byCategory = await seedQueries.byCategory(api, created, seed.dataSources.postgres);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  async function makeDashboard(api: RedashApi) {
    const dashboard = await createDashboardViaApi(api, created, "D Widget menu");
    return {
      id: dashboard.id,
      table: await addWidgetViaApi(
        api,
        dashboard.id,
        tableRows.viz.table,
        { col: 0, row: 0, sizeX: 6, sizeY: 12, autoHeight: true },
        dashboardLevel("rows")
      ),
      counter: await addWidgetViaApi(api, dashboard.id, byCategory.viz.counter, { col: 6, row: 0, sizeX: 3, sizeY: 5 }),
    };
  }

  async function download(page: Page, widgetId: number, kind: "CSV" | "TSV" | "Excel"): Promise<Download> {
    const widget = widgetById(page, widgetId);
    await expect(widget.locator("tbody tr.ant-table-row")).toHaveCount(12);
    const menu = await openWidgetMenu(page, widget);
    const [file] = await Promise.all([
      page.waitForEvent("download"),
      menu.getByText(`Download as ${kind} File`).click(),
    ]);
    return file;
  }

  const read = async (file: Download) => fs.readFileSync(await file.path());

  test("the menu of a widget offers downloads, View Query, Edit Parameters and Remove from Dashboard", async ({
    page,
    api,
  }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const items = (await openWidgetMenu(page, widgetById(page, dashboard.table))).locator(".ant-dropdown-menu-item");
    await expect(items).toHaveText([
      "Download as CSV File",
      "Download as TSV File",
      "Download as Excel File",
      "View Query",
      "Edit Parameters",
      "Remove from Dashboard",
    ]);
    await page.keyboard.press("Escape");

    // A widget of a query without parameters has no Edit Parameters
    const counterItems = (await openWidgetMenu(page, widgetById(page, dashboard.counter))).locator(
      ".ant-dropdown-menu-item"
    );
    await expect(counterItems).toHaveText([
      "Download as CSV File",
      "Download as TSV File",
      "Download as Excel File",
      "View Query",
      "Remove from Dashboard",
    ]);
  });

  test("Download as CSV File gives the rows the widget shows", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const lines = (await read(await download(page, dashboard.table, "CSV"))).toString("utf8").trim().split("\r\n");
    expect(lines).toHaveLength(13);
    expect(lines[0]).toBe("id,category,channel,amount,customer");
    expect(lines[1]).toBe("1,Hardware,direct,229.54,customer-013");
  });

  test("Download as TSV File gives the rows the widget shows", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const lines = (await read(await download(page, dashboard.table, "TSV"))).toString("utf8").trim().split("\r\n");
    expect(lines).toHaveLength(13);
    expect(lines[0]).toBe("id\tcategory\tchannel\tamount\tcustomer");
    expect(lines[1]).toBe("1\tHardware\tdirect\t229.54\tcustomer-013");
  });

  test("Download as Excel File gives a valid workbook", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const workbook = await read(await download(page, dashboard.table, "Excel"));
    const entries = zipEntries(workbook);
    // The number of parts depends on the library version of the backend (7 or 8 XML files)
    expect(entries.filter((name) => name.endsWith(".xml")).length).toBeGreaterThanOrEqual(7);
    expect(entries).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "xl/workbook.xml",
        "xl/worksheets/sheet1.xml",
        "xl/styles.xml",
        "docProps/core.xml",
      ])
    );
    expect(workbook.subarray(0, 2).toString()).toBe("PK");
  });

  test("the downloaded files are named after the query and the date", async ({ page, api }) => {
    backendUpgradeIssue("download-file-name-bytes");
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const name = tableRows.name.replace(/ /g, "_");
    for (const [kind, extension] of [
      ["CSV", "csv"],
      ["TSV", "tsv"],
      ["Excel", "xlsx"],
    ] as const) {
      const file = await download(page, dashboard.table, kind);
      expect(file.suggestedFilename()).toMatch(new RegExp(`^${name}_\\d{4}_\\d{2}_\\d{2}\\.${extension}$`));
    }
  });

  test("View Query opens the query with the widget's parameter value", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id, "?p_rows=7");
    const widget = widgetById(page, dashboard.table);
    await expect(widget.locator("tbody tr.ant-table-row")).toHaveCount(7);

    const menu = await openWidgetMenu(page, widget);
    await menu.getByText("View Query").click();
    await expect(page).toHaveURL(new RegExp(`/queries/${tableRows.id}(/source)?\\?p_rows=7`));
    await expect(page.locator(".query-page-header, .page-header--query").first()).toContainText(tableRows.name);
    await expect(page.locator('[data-test="ParameterName-rows"] input')).toHaveValue("7");
  });

  test("Remove from Dashboard asks for confirmation and removes the widget", async ({ page, api }) => {
    const dashboard = await makeDashboard(api);
    await openDashboard(page, dashboard.id);
    const widget = widgetById(page, dashboard.counter);

    await (await openWidgetMenu(page, widget)).getByText("Remove from Dashboard").click();
    await expect(confirmDialog(page).locator(".ant-modal-confirm-title")).toHaveText("Delete Widget");
    await confirmDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    await expect(widget).toBeVisible();

    await (await openWidgetMenu(page, widget)).getByText("Remove from Dashboard").click();
    await expect(confirmButton(page)).toHaveText("Delete");
    await confirmButton(page).click();
    await expect(widget).toHaveCount(0);
    await expect(gridItems(page)).toHaveCount(1);
    await expect
      .poll(async () => (await getDashboard(api, dashboard.id)).widgets.map((w) => w.id))
      .toEqual([dashboard.table]);

    await page.reload();
    await expect(widgetById(page, dashboard.table)).toBeVisible();
    await expect(gridItems(page)).toHaveCount(1);
  });
});
