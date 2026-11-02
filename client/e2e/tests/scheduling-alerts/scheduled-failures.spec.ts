import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, execute } from "../../support/ui";
import { Created, everyMinute, getQuery, lastRefreshRun, setSchedule } from "./helpers";

test.describe("A scheduled query that always fails", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("@slow is retried later than its schedule says, after a failure", async ({ page, api, seed }) => {
    // A healthy 1-minute query runs every 90 s. After n failures in a row the next attempt is put off by another
    // 2^n minutes: 3 minutes after the first failure. The API does not expose the failure counter
    // (`schedule_failures`), so the test measures the gap between the first two attempts. (The original
    // exploration watched four attempts, 3 / 5.5 / 9 / 17 minutes apart; that takes over half an hour.)
    test.setTimeout(8 * 60_000);
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("S always fails"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select * from e2e_s_table_that_does_not_exist",
      run: false,
    });
    created.queries.push(id);

    // Run by hand, it shows the database's error
    await page.goto(`/queries/${id}/source`);
    const { error } = await execute(page);
    expect(error).toContain('relation "e2e_s_table_that_does_not_exist" does not exist');

    await setSchedule(api, id, everyMinute);
    const before = await getQuery(api, id);
    // Each run of the scheduler's refresh job reports the queries it enqueued
    const attempts = new Set<number>();
    const watch = async () => {
      const run = await lastRefreshRun(api);
      if (run.queryIds.includes(id)) {
        attempts.add(run.at);
      }
      return attempts.size;
    };
    // Never run successfully, so it is due at once
    await expect
      .poll(watch, { timeout: 60_000, intervals: [2000], message: "the scheduler picks the query up" })
      .toBe(1);
    const [first] = [...attempts];

    await expect
      .poll(watch, { timeout: 300_000, intervals: [4000], message: "the scheduler tries the failing query again" })
      .toBe(2);
    const [, second] = [...attempts].sort();
    // 60 s interval + 2 minutes back-off, then the next 30 s tick. Without back-off it would be 60 to 90 s.
    expect(second - first).toBeGreaterThanOrEqual(175);
    expect(second - first).toBeLessThan(240);

    // The failures leave no result and do not count as edits
    const after = await getQuery(api, id);
    expect(after.latest_query_data_id).toBeNull();
    expect(after.retrieved_at).toBeNull();
    expect(after.updated_at).toBe(before.updated_at);
    expect(after.schedule).toEqual(everyMinute);
    // The query page gives no sign that scheduled runs are failing
    await page.goto(`/queries/${id}`);
    await expect(byTest(page, "EditSchedule").first()).toHaveText("Every minute");
    await expect(byTest(page, "TableVisualization")).toHaveCount(0);
  });
});
