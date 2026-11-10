import { expect, test } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { lastRefreshRun, serverTime, waitForJob } from "./helpers";

// The scheduler's periodic jobs, as far as they can be seen from outside the servers. The original exploration
// read them off the worker log; these tests look at what each job leaves behind.
test.describe("Periodic jobs", () => {
  test("@slow refresh_queries runs every 30 seconds", async ({ api }) => {
    test.setTimeout(3 * 60_000);
    const runs = [(await lastRefreshRun(api)).at];
    for (const nth of ["next", "one after"]) {
      await expect
        .poll(async () => (await lastRefreshRun(api)).at, {
          timeout: 60_000,
          intervals: [2000],
          message: `the ${nth} run of the refresh job reports`,
        })
        .toBeGreaterThan(runs[runs.length - 1]);
      runs.push((await lastRefreshRun(api)).at);
    }
    const gap = runs[2] - runs[1];
    expect(gap).toBeGreaterThan(20);
    expect(gap).toBeLessThan(45);
  });

  test("@slow sync_user_details stores when a user was last active", async ({ page, api, seed }) => {
    test.setTimeout(3 * 60_000);
    // Requests are noted in Redis; the job copies them to the user every minute
    const before = await serverTime(api, seed.dataSources.postgres);
    await page.goto("/queries");
    await expect(page.locator(".page-queries-list, .ant-table, .empty-state").first()).toBeVisible();
    await expect
      .poll(async () => new Date((await api.get(`/api/users/${seed.adminId}`)).active_at).getTime(), {
        timeout: 120_000,
        intervals: [5000],
        message: "the admin's active_at catches up with the request just made",
      })
      .toBeGreaterThan(before - 1000);
  });

  test("the schema refresh job of a PostgreSQL data source returns its tables", async ({ api, seed }) => {
    // refresh_schemas enqueues this job for every data source, every 30 minutes
    const started = await api.get(`/api/data_sources/${seed.dataSources.postgres}/schema`, { refresh: "true" });
    const job = await waitForJob(api, started.job);
    expect(job.status, JSON.stringify(job.error)).toBe(3);
    const { schema } = await api.get(`/api/data_sources/${seed.dataSources.postgres}/schema`);
    const tables = (schema as { name: string }[]).map((table) => table.name.replace(/^public\./, ""));
    expect(tables).toEqual(expect.arrayContaining(["cities", "orders", "events"]));
  });

  test("the schema refresh job of a CSV data source finishes without an error", async ({ api, seed }) => {
    knownIssue("csv-schema-refresh-fails");
    const started = await api.get(`/api/data_sources/${seed.dataSources.csv}/schema`, { refresh: "true" });
    const job = await waitForJob(api, started.job);
    // The bug: CSV.get_schema() got an unexpected keyword argument 'get_stats'
    expect(job.error || null, "the job reports no error").toBeNull();
    expect(job.status).toBe(3);
  });

  // Not covered here: empty_schedules (hourly), cleanup_query_results (every 5 minutes, deletes unused results
  // older than a week), send_aggregated_errors (hourly) and version_check (daily) leave nothing a test can wait
  // for in reasonable time. The backend unit tests cover them (tests/tasks/test_empty_schedule.py,
  // test_cleanup_query_results.py, test_failure_report.py and tests/test_version_check.py).
});
