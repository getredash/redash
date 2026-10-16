import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { setSql } from "../../support/ui";
import { executeButton, executionStatus, openNewQuery, resultRows, run, sqlViaApi } from "./helpers";

const cancelButton = (page: Page) => executionStatus(page).getByRole("button", { name: "Cancel" });

/**
 * Each test runs a sleep statement carrying a unique marker, and asks the database itself (through the API, in a
 * separate session) how many statements with that marker are still running. The marker is passed in two halves so
 * the check does not count itself.
 */
function probe(kind: "pg" | "mysql") {
  const head = "Qcancel_";
  const tail = uniqueName("m").replace(/\W/g, "_");
  const marker = head + tail;
  const check =
    kind === "pg"
      ? `select count(*) as still_running from pg_stat_activity where query like '%' || '${head}' || '${tail}' || '%' and state <> 'idle' and pid <> pg_backend_pid()`
      : `select count(*) as still_running from information_schema.processlist where info like concat('%', '${head}', '${tail}', '%') and id <> connection_id()`;
  return {
    marker,
    stillRunning: async (api: RedashApi, dataSourceId: number) =>
      Number((await sqlViaApi(api, dataSourceId, check))[0].still_running),
  };
}

async function cancelStopsTheQuery(
  page: Page,
  api: RedashApi,
  options: { kind: "pg" | "mysql"; dataSource: string; dataSourceId: number; sleep: (marker: string) => string }
) {
  // Generous limits: the workers are shared with every other test, so a job may wait in the queue for a while
  test.setTimeout(240_000);
  const { marker, stillRunning } = probe(options.kind);
  await openNewQuery(page, options.dataSource);
  await setSql(page, options.sleep(marker));

  const started = page.waitForResponse(
    (response) => response.request().method() === "POST" && /\/api\/query_results$/.test(response.url())
  );
  await executeButton(page).click();
  const jobId: string = (await (await started).json()).job.id;
  await expect(executionStatus(page)).toContainText("Executing query", { timeout: 60_000 });
  await expect(executeButton(page)).toBeDisabled();
  // The statement really is running on the database before we cancel it
  await expect.poll(() => stillRunning(api, options.dataSourceId), { timeout: 60_000 }).toBe(1);

  const cancelRequest = page.waitForRequest((request) => request.method() === "DELETE");
  await cancelButton(page).click();
  expect(new URL((await cancelRequest).url()).pathname).toBe(`/api/jobs/${jobId}`);

  // The page says so, long before the sleep would have ended by itself
  await expect(executionStatus(page)).toContainText("Error running query: Query cancelled by user.", {
    timeout: 15_000,
  });
  await expect(executeButton(page)).toBeEnabled();

  // The job is over on the server, and the statement is gone from the database
  await expect
    .poll(async () => (await api.get(`/api/jobs/${jobId}`)).job.status, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(4);
  expect(JSON.stringify((await api.get(`/api/jobs/${jobId}`)).job.error)).toContain("Query cancelled by user.");
  await expect.poll(() => stillRunning(api, options.dataSourceId), { timeout: 60_000 }).toBe(0);

  // And the page can run the next query right away
  await setSql(page, "select 'after cancel' as state");
  const { error } = await run(page);
  expect(error).toBeNull();
  expect(await resultRows(page)).toEqual([["after cancel"]]);
}

test.describe("Cancelling a running query", () => {
  test("Cancel stops a running PostgreSQL query", async ({ page, api, seed }) => {
    await cancelStopsTheQuery(page, api, {
      kind: "pg",
      dataSource: DATA_SOURCES.postgres,
      dataSourceId: seed.dataSources.postgres,
      sleep: (marker) => `select pg_sleep(300), '${marker}' as marker`,
    });
  });

  test("Cancel stops a running MySQL query", async ({ page, api, seed }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    await cancelStopsTheQuery(page, api, {
      kind: "mysql",
      dataSource: DATA_SOURCES.mysql,
      dataSourceId: seed.dataSources.mysql as number,
      sleep: (marker) => `select sleep(300), '${marker}' as marker`,
    });
  });

  test("Cancel pressed before the server has answered the execute request still stops the query", async ({
    page,
    api,
    seed,
    guard,
  }) => {
    knownIssue("cancel-before-job-id");
    // The bug answers `DELETE /api/jobs/undefined` with a 500; let the assertions below report it
    guard.allowServerErrors(/DELETE \/api\/jobs\/undefined/);
    guard.allowPageErrors(/AxiosError: Request failed with status code 500/);
    const { marker, stillRunning } = probe("pg");
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, `select pg_sleep(20), '${marker}' as marker`);

    // A slow server: the answer to the execute request (which carries the job id) takes two seconds
    await page.route("**/api/query_results", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      await route.continue();
    });
    const deletes: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "DELETE") {
        deletes.push(new URL(request.url()).pathname);
      }
    });

    await executeButton(page).click();
    await cancelButton(page).click();

    await expect(executionStatus(page)).toContainText("Query cancelled by user.", { timeout: 12_000 });
    expect(deletes).not.toContain("/api/jobs/undefined");
    await expect.poll(() => stillRunning(api, seed.dataSources.postgres), { timeout: 10_000 }).toBe(0);
    await expect(executeButton(page)).toBeEnabled();
  });
});
