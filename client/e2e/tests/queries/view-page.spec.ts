import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, getSql } from "../../support/ui";
import { editor, MOD, openQuerySource, resultRows, waitUntilRunIsOver } from "./helpers";

// Returns something else on every run, so a refresh is visible
const SQL =
  "select to_char(clock_timestamp(), 'HH24:MI:SS.MS') as ran_at, round((random()*1000000)::numeric) as rnd, count(*) as orders from orders";

const refreshButton = (page: Page) => page.locator('.query-page-header [data-test="ExecuteButton"]');
const fullscreenButton = (page: Page) => page.locator('.query-results-footer [data-test="ExecuteButton"]');
const firstRow = async (page: Page) => (await resultRows(page))[0];

/** Waits for the row on the page to differ from the given one, and returns it. */
async function newRow(page: Page, previous: string[]) {
  await expect.poll(() => firstRow(page), { timeout: 30_000 }).not.toEqual(previous);
  await waitUntilRunIsOver(page);
  return firstRow(page);
}

test.describe("Query view page", () => {
  test("Show Results Only, Refresh, fullscreen, reload and Edit Source", async ({ page, api, seed }) => {
    const name = uniqueName("Q view page");
    const query = await createQueryViaApi(api, { name, dataSourceId: seed.dataSources.postgres, sql: SQL });
    await openQuerySource(page, query.id);
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    const inEditor = await firstRow(page);
    expect(inEditor).toHaveLength(3);
    expect(inEditor[2]).toBe("600");

    // The view page: no editor, the same result
    await byTest(page, "QueryPageShowResultOnly").click();
    await expect(page).toHaveURL(new RegExp(`/queries/${query.id}(#\\d+)?$`));
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    await expect(byTest(page, "QueryEditor")).toHaveCount(0);
    await expect(page.locator(".query-page-header h3")).toHaveText(name);
    expect(await firstRow(page)).toEqual(inEditor);
    await expect(page.locator(".query-results-footer")).toContainText(/1\s*row/);

    // Refresh runs the query again
    await refreshButton(page).hover();
    await expect(refreshButton(page)).toHaveText(/Refresh/);
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toHaveText(/^(Cmd|Ctrl) \+ Enter$/);
    await refreshButton(page).click();
    const refreshed = await newRow(page, inEditor);
    expect(refreshed[2]).toBe("600");

    // So does Cmd/Ctrl+Enter
    await page.keyboard.press(`${MOD}+Enter`);
    const viaShortcut = await newRow(page, refreshed);
    expect((await api.get(`/api/queries/${query.id}/results.json`)).query_result.data.rows[0].ran_at).toBe(
      viaShortcut[0]
    );

    // Fullscreen hides what surrounds the result (the "created by" block below it), and comes back
    const metadata = page.locator(".query-metadata");
    await expect(metadata).toBeVisible();
    await fullscreenButton(page).click();
    await expect(page.locator(".query-view-fullscreen")).toHaveCount(1);
    await expect(metadata).toBeHidden();
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    await fullscreenButton(page).click();
    await expect(page.locator(".query-view-fullscreen")).toHaveCount(0);
    await expect(metadata).toBeVisible();

    // A reload shows the stored result without running the query
    const executions: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && /\/results$|\/api\/query_results$/.test(request.url())) {
        executions.push(request.url());
      }
    });
    await page.reload();
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    expect(await firstRow(page)).toEqual(viaShortcut);

    // Edit Source: the editor with the SQL and the same result
    await page.locator(".query-page-header a").filter({ hasText: "Edit Source" }).click();
    await expect(page).toHaveURL(new RegExp(`/queries/${query.id}/source`));
    await editor(page).waitFor();
    await expect.poll(() => getSql(page)).toBe(SQL);
    await expect(byTest(page, "TableVisualization")).toBeVisible();
    expect(await firstRow(page)).toEqual(viaShortcut);
    expect(executions.filter((url) => !/max_age/.test(url))).toEqual([]);
  });

  test("a query that never ran offers Refresh Now, which runs it", async ({ page, api, seed }) => {
    // New text every time: a query whose exact text ran before on this data source gets that stored result
    const column = uniqueName("city").replace(/\W/g, "_");
    const query = await createQueryViaApi(api, {
      name: uniqueName("Q never run"),
      dataSourceId: seed.dataSources.postgres,
      sql: `select name as ${column} from cities where country_code = 'IL'`,
      run: false,
    });
    await page.goto(`/queries/${query.id}`);
    const results = page.locator(".query-results");
    await expect(results).toContainText("Query has no result");
    await expect(byTest(page, "TableVisualization")).toHaveCount(0);

    await results.getByRole("button", { name: "Refresh Now" }).click();
    await expect(byTest(page, "TableVisualization")).toBeVisible({ timeout: 30_000 });
    expect(await resultRows(page)).toEqual([["Tel Aviv"]]);
    await expect(page.locator(".query-results-footer")).toContainText(/1\s*row/);
    await expect(results).not.toContainText("Query has no result");
  });
});
