import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test } from "../../support/fixtures";
import { byTest, getSql, pick } from "../../support/ui";
import {
  autoLimit,
  editor,
  focusEditorEnd,
  openNewQuery,
  run,
  schemaColumns,
  schemaTables,
  texts,
  typeKeys,
} from "./helpers";

const TABLES = ["cities", "events", "orders"];
// Other tests may create tables of their own in the demo database; look at the three demo tables only
const demoTables = (page: Page) => schemaTables(page).filter({ hasText: /^(cities|events|orders)$/ });

test.describe("Schema browser", () => {
  test("lists the tables of the PostgreSQL data source", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await expect(demoTables(page)).toHaveText(TABLES);
  });

  test("the filter box narrows tables and columns", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    const filter = page.getByLabel("Search schema");

    await filter.click();
    await page.keyboard.type("ord");
    await expect(demoTables(page)).toHaveText(["orders"]);

    // "<table> <column>" filters the columns of the matching table as well
    await filter.fill("");
    await page.keyboard.type("orders amo");
    await expect(schemaTables(page)).toHaveText(["orders"]);
    await schemaTables(page).first().click();
    await expect(schemaColumns(page)).toHaveCount(1);
    await expect(schemaColumns(page)).toContainText(["amount"]);
    await schemaTables(page).first().click();
    await expect(schemaColumns(page)).toHaveCount(0);

    await filter.fill("");
    await page.keyboard.type("zzz");
    await expect(schemaTables(page)).toHaveCount(0);

    await filter.fill("");
    await expect(demoTables(page)).toHaveText(TABLES);
  });

  test("a table expands to its columns with their types", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await schemaTables(page).filter({ hasText: "orders" }).click();
    await expect(schemaColumns(page)).toHaveCount(9);
    const columns = await texts(schemaColumns(page));
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^amount NUMERIC$/i),
        expect.stringMatching(/^created_at TIMESTAMP WITHOUT TIME ZONE$/i),
        expect.stringMatching(/^id INTEGER$/i),
        expect.stringMatching(/^note TEXT$/i),
      ])
    );
    expect(columns.map((column) => column.split(" ")[0]).sort()).toEqual(
      ["amount", "category", "channel", "city_id", "created_at", "customer", "id", "note", "quantity"].sort()
    );
  });

  test("clicking a column and a table's arrow inserts their names into the editor", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await schemaTables(page).filter({ hasText: "orders" }).click();
    await editor(page).click();
    await typeKeys(page, "select ");
    await expect.poll(() => getSql(page)).toBe("select ");

    const column = schemaColumns(page).filter({ hasText: "amount" }).first();
    await column.hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toContainText(
      "Insert column name into query text"
    );
    await column.click();
    await expect.poll(() => getSql(page)).toBe("select amount");

    await focusEditorEnd(page);
    await typeKeys(page, " from ");
    const table = page.locator(".schema-list-item").filter({ hasText: "orders" }).first();
    await table.hover();
    await table.locator(".copy-to-editor").first().click();
    await expect.poll(() => getSql(page)).toBe("select amount from orders");

    // The text built this way is what gets executed. The editor hands its text to the page 100 ms after the
    // last change (known issue "execute-runs-stale-text"), so pause like a person would before running it.
    await page.waitForTimeout(300);
    await autoLimit(page).click();
    const { sent, result, error } = await run(page);
    expect(error).toBeNull();
    expect(sent.query).toBe("select amount from orders");
    expect(result?.data.rows).toHaveLength(600);
  });

  test("the refresh button reloads the schema from the database", async ({ page, seed }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    const refreshes: string[] = [];
    page.on("request", (request) => {
      if (/\/schema\?/.test(request.url())) {
        refreshes.push(`${request.method()} ${new URL(request.url()).pathname}${new URL(request.url()).search}`);
      }
    });
    const refresh = page.locator(".schema-control button");
    await refresh.hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toContainText("Refresh Schema");
    await refresh.click();
    await expect
      .poll(() => refreshes)
      .toEqual([`GET /api/data_sources/${seed.dataSources.postgres}/schema?refresh=true`]);
    await expect(page.locator(".schema-control .zmdi-hc-spin")).toHaveCount(0, { timeout: 60_000 });
    await expect(demoTables(page)).toHaveText(TABLES);
  });

  test("switching the data source shows the MySQL schema, hides it for JSON, and shows it again", async ({
    page,
    seed,
  }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    await openNewQuery(page, DATA_SOURCES.postgres);
    const select = byTest(page, "SelectDataSource");

    // Both databases have the same tables, so wait for the MySQL schema itself before looking at the list
    const mysqlSchema = page.waitForResponse(
      (response) => response.url().includes(`/api/data_sources/${seed.dataSources.mysql}/schema`),
      { timeout: 60_000 }
    );
    await pick(page, select, DATA_SOURCES.mysql);
    await mysqlSchema;
    await expect(schemaColumns(page)).toHaveCount(0);
    await expect(demoTables(page)).toHaveText(TABLES, { timeout: 60_000 });
    await schemaTables(page).filter({ hasText: "cities" }).click();
    await expect(schemaColumns(page)).toHaveCount(6);
    // MySQL's own type names (PostgreSQL says "character varying", "integer", "double precision")
    await expect(async () => {
      const columns = (await texts(schemaColumns(page))).map((column) => column.toLowerCase());
      expect(columns).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^name varchar$/),
          expect.stringMatching(/^country_code char$/),
          expect.stringMatching(/^id int$/),
          expect.stringMatching(/^lat double$/),
        ])
      );
    }).toPass({ timeout: 60_000 });

    await pick(page, select, DATA_SOURCES.json);
    await expect(select).toContainText(DATA_SOURCES.json);
    // The previous schema stays until the schema job of the new source has answered; the queue may be busy
    await expect(page.locator(".schema-container")).toHaveCount(0, { timeout: 60_000 });
    await expect(editor(page)).toBeVisible();

    await pick(page, select, DATA_SOURCES.postgres);
    await expect(demoTables(page)).toHaveText(TABLES, { timeout: 60_000 });
  });
});
