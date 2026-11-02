import type { Page } from "@playwright/test";
import { DATA_SOURCES, INTERNAL, PUBLIC_CSV_URL, PUBLIC_JSON_URL } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi, pick, setSql, toast } from "../../support/ui";
import { clearEditor, editor, openNewQuery, PUBLIC_CSV_WITH_DATES_URL, resultRows, run } from "./helpers";

const columnTypes = (result: { data: { columns: { name: string; type: string | null }[] } } | null) =>
  Object.fromEntries((result?.data.columns || []).map((column) => [column.name, column.type]));

test.describe("MySQL", () => {
  test("a query with dates, decimals and text returns typed columns", async ({ page, seed }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    await openNewQuery(page, DATA_SOURCES.mysql);
    await setSql(
      page,
      "select o.id, o.created_at, date(o.created_at) as day, o.amount, o.quantity, c.name as city, o.note " +
        "from orders o join cities c on c.id = o.city_id order by o.id limit 20"
    );
    const { result, error } = await run(page);
    expect(error).toBeNull();
    expect(result?.data.rows).toHaveLength(20);
    expect(columnTypes(result)).toMatchObject({
      id: "integer",
      created_at: "datetime",
      day: "date",
      amount: "float",
      quantity: "integer",
      city: "string",
    });
    expect(result?.data.rows[0]).toMatchObject({
      id: 1,
      created_at: "2026-04-21T20:00:00",
      day: "2026-04-21",
      amount: 229.54,
      quantity: 3,
      city: "Tel Aviv",
      note: "gift <b>wrap</b>",
    });
    const rows = await resultRows(page);
    expect(rows).toHaveLength(20);
    expect(rows[0][0]).toBe("1");
    expect(rows[0][5]).toBe("Tel Aviv");
  });
});

test.describe("Query Results data source", () => {
  let sourceId: number;

  test.beforeAll(async ({ api, seed }) => {
    sourceId = (
      await createQueryViaApi(api, {
        name: uniqueName("Q source for query results"),
        dataSourceId: seed.dataSources.postgres,
        sql:
          "select category, channel, count(*) as orders, sum(amount) as revenue, max(created_at) as last_order " +
          "from orders group by 1, 2 order by 1, 2",
      })
    ).id;
  });

  test("query_<id> runs the saved query and can be aggregated", async ({ page, api }) => {
    await openNewQuery(page, DATA_SOURCES.queryResults, { schema: false });
    await setSql(
      page,
      `select category, sum(orders) as orders, round(sum(revenue), 2) as revenue, max(last_order) as last_order from query_${sourceId} group by category order by category`
    );
    const { result, error } = await run(page);
    expect(error).toBeNull();
    expect(result?.data.rows.map((row) => row.category)).toEqual(["Hardware", "Services", "Software", "Training"]);
    expect(result?.data.rows.reduce((sum, row) => sum + Number(row.orders), 0)).toBe(600);
    expect(columnTypes(result)).toMatchObject({ category: "string", orders: "integer", revenue: "float" });

    // The totals are those of the source query
    const source: { category: string; revenue: number }[] = (await api.get(`/api/queries/${sourceId}/results.json`))
      .query_result.data.rows;
    const hardware = source.filter((row) => row.category === "Hardware").reduce((sum, row) => sum + row.revenue, 0);
    expect(Number(result?.data.rows[0].revenue)).toBeCloseTo(hardware, 1);
    expect((await resultRows(page)).map((row) => row[0])).toEqual(["Hardware", "Services", "Software", "Training"]);
  });

  test("cached_query_<id> reads the stored result of the saved query", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.queryResults, { schema: false });
    await setSql(
      page,
      `select channel, count(*) as n, sum(orders) as orders from cached_query_${sourceId} group by channel order by 1`
    );
    const { result, error } = await run(page);
    expect(error).toBeNull();
    expect(result?.data.rows.map((row) => [row.channel, row.n])).toEqual([
      ["direct", 4],
      ["partner", 4],
      ["web", 4],
    ]);
    expect(result?.data.rows.reduce((sum, row) => sum + Number(row.orders), 0)).toBe(600);
  });

  test("an unknown query id is reported as an error", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.queryResults, { schema: false });
    await setSql(page, "select * from query_99999999");
    const { error } = await run(page);
    // The raw message of the ORM; its wording depends on the SQLAlchemy version
    expect(error).toMatch(/^Error running query: No row was found/);
  });
});

/** Types YAML line by line with the keyboard, removing the editor's auto-indent. */
async function typeYaml(page: Page, lines: string[]) {
  await clearEditor(page);
  for (const [index, line] of lines.entries()) {
    if (index > 0) {
      await page.keyboard.press("Enter");
      await page.keyboard.press("Shift+Home");
      await page.keyboard.press("Backspace");
    }
    await page.keyboard.insertText(line);
  }
}

test.describe("JSON data source", () => {
  test("a public URL with a field list returns rows and nested fields @internet", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.json, { schema: false });
    await setSql(page, `url: ${PUBLIC_JSON_URL}\nfields: [id, name, email, address.city, company.name]`);
    const { result, error } = await run(page, undefined, 90_000);
    expect(error).toBeNull();
    expect(result?.data.rows).toHaveLength(10);
    expect(result?.data.columns.map((column) => column.name)).toEqual([
      "id",
      "name",
      "email",
      "address.city",
      "company.name",
    ]);
    expect(result?.data.rows[0]).toMatchObject({ id: 1, name: "Leanne Graham", "address.city": "Gwenborough" });
    expect((await resultRows(page))[0].slice(0, 2)).toEqual(["1", "Leanne Graham"]);
  });

  test("a private address is refused", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.json, { schema: false });
    await setSql(page, `url: ${INTERNAL.http}/data.json`);
    const { error } = await run(page, undefined, 90_000);
    expect(error).toBe("Error running query: Can't query private addresses.");
  });

  test("a host that does not resolve is reported as an error", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.json, { schema: false });
    await setSql(page, "url: https://no-such-host-q10.invalid/x.json");
    const { error } = await run(page, undefined, 90_000);
    expect(error).toMatch(/Error running query:.*(Name or service not known|Connection aborted|resolve)/);
  });

  test("invalid YAML typed into the editor gets an error marker in the gutter", async ({ page }) => {
    knownIssue("csp-blocks-ace-worker");
    await openNewQuery(page, DATA_SOURCES.json, { schema: false });
    await typeYaml(page, ["url: https://example.com/a.json", "fields: [id, name", "  : : bad"]);
    await expect(editor(page)).toContainText("fields: [id, name");
    await expect(page.locator('[data-test="QueryEditor"] .ace_gutter-cell.ace_error')).not.toHaveCount(0);
  });
});

test.describe("CSV data source", () => {
  test("a public CSV returns typed columns @internet", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.csv, { schema: false });
    await setSql(page, `url: ${PUBLIC_CSV_URL}\nuser-agent: redash-e2e`);
    const { result, error } = await run(page, undefined, 90_000);
    expect(error).toBeNull();
    // The iris data set: 150 rows, four measurements and the species
    expect(result?.data.rows).toHaveLength(150);
    expect(columnTypes(result)).toEqual({
      sepal_length: "float",
      sepal_width: "float",
      petal_length: "float",
      petal_width: "float",
      species: "string",
    });
    expect(result?.data.rows[0]).toEqual({
      sepal_length: 5.1,
      sepal_width: 3.5,
      petal_length: 1.4,
      petal_width: 0.2,
      species: "setosa",
    });
    expect((await resultRows(page))[0]).toEqual(["5.10", "3.50", "1.40", "0.20", "setosa"]);
  });

  test("a date column is text by default and a datetime with parse_dates @internet", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.csv, { schema: false });
    await setSql(page, `url: ${PUBLIC_CSV_WITH_DATES_URL}\nuser-agent: redash-e2e`);
    let execution = await run(page, undefined, 90_000);
    expect(execution.error).toBeNull();
    // The S&P 500 constituents: about 500 rows; text columns with commas inside, an integer id, a date
    expect(execution.result?.data.rows.length).toBeGreaterThan(400);
    expect(columnTypes(execution.result)).toMatchObject({
      Symbol: "string",
      Security: "string",
      "Headquarters Location": "string",
      "Date added": "string",
      CIK: "integer",
    });

    await setSql(page, `url: ${PUBLIC_CSV_WITH_DATES_URL}\nuser-agent: redash-e2e\nparse_dates: ["Date added"]`);
    execution = await run(page, undefined, 90_000);
    expect(execution.error).toBeNull();
    expect(columnTypes(execution.result)).toMatchObject({ Symbol: "string", "Date added": "datetime", CIK: "integer" });
    for (const row of execution.result?.data.rows.slice(0, 20) || []) {
      expect(String(row["Date added"])).toMatch(/^\d{4}-\d{2}-\d{2}[T ]00:00:00/);
    }
  });

  test("a private address is refused", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.csv, { schema: false });
    await setSql(page, `url: ${INTERNAL.http}/data.csv\nuser-agent: redash-e2e`);
    const { error } = await run(page, undefined, 90_000);
    expect(error).toBe("Error running query: Can't query private addresses.");
  });

  test("selecting the CSV data source shows no schema error", async ({ page, seed }) => {
    knownIssue("csv-schema-refresh-fails");
    // Start from PostgreSQL, so the schema request of the CSV source is made by this test's own click
    await page.addInitScript(
      (id) => localStorage.setItem("lastSelectedDataSourceId", String(id)),
      seed.dataSources.postgres
    );
    await openNewQuery(page, DATA_SOURCES.postgres);
    const schemaJobs: { status: number; error: unknown }[] = [];
    page.on("response", async (response) => {
      if (/\/api\/(jobs\/|data_sources\/\d+\/schema)/.test(response.url())) {
        const body = await response.json().catch(() => null);
        if (body?.job) {
          schemaJobs.push(body.job);
        }
      }
    });
    await pick(page, byTest(page, "SelectDataSource"), DATA_SOURCES.csv);
    await expect(byTest(page, "SelectDataSource")).toContainText(DATA_SOURCES.csv);
    // The schema job of the CSV source has ended (3 = finished, 4 = failed)
    await expect.poll(() => schemaJobs.some((job) => job.status >= 3), { timeout: 30_000 }).toBe(true);
    expect(schemaJobs.filter((job) => job.status === 4)).toEqual([]);
    await expect(toast(page).filter({ hasText: "Schema refresh failed" })).toHaveCount(0);
  });
});
