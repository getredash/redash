import { expect, test, uniqueName } from "../../support/fixtures";
import { createQueryViaApi, tableRows } from "../../support/ui";
import {
  Created,
  confirmSchedule,
  getQuery,
  lastRefreshRun,
  latestRows,
  openScheduleDialog,
  pickInterval,
  scheduleLink,
} from "./helpers";

// The scheduler looks for due queries every 30 s, and a 1-minute query is due once 60 s have passed since its
// last result: in practice it runs every 90 s.
test.describe("A query on a 1-minute schedule", () => {
  test.describe.configure({ mode: "serial" });
  const created = new Created();
  let queryId: number;

  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("@slow keeps refreshing on its own", async ({ page, api, seed }) => {
    test.setTimeout(7 * 60_000);
    queryId = (
      await createQueryViaApi(api, {
        name: uniqueName("S now every minute"),
        dataSourceId: seed.dataSources.postgres,
        sql: "select to_char(now(), 'HH24:MI:SS.US') as ran_at_text, 1 as one",
      })
    ).id;
    created.queries.push(queryId);
    const [manualRow] = await latestRows(api, queryId);

    await page.goto(`/queries/${queryId}`);
    const dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "1 minute");
    await confirmSchedule(page, dialog);
    await expect(scheduleLink(page)).toHaveText("Every minute");
    await expect.poll(async () => (await getQuery(api, queryId)).schedule?.interval).toBe(60);
    const manual = await getQuery(api, queryId);

    // Two refreshes nobody asked for, each with a new result
    const results = [manual.latest_query_data_id];
    const retrievedAt = [manual.retrieved_at as string];
    for (const nth of ["first", "second"]) {
      await expect
        .poll(async () => (await getQuery(api, queryId)).latest_query_data_id, {
          timeout: 150_000,
          intervals: [3000],
          message: `the ${nth} scheduled refresh stores a new result`,
        })
        .not.toBe(results[results.length - 1]);
      const query = await getQuery(api, queryId);
      results.push(query.latest_query_data_id);
      retrievedAt.push(query.retrieved_at as string);
    }
    expect(new Set(results).size).toBe(3);
    const times = retrievedAt.map((time) => new Date(time).getTime());
    expect(times[1]).toBeGreaterThan(times[0]);
    // Not sooner than the interval allows
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(60_000);
    // A scheduled refresh does not count as an edit of the query
    expect((await getQuery(api, queryId)).updated_at).toBe(manual.updated_at);

    // The page shows the refreshed result after a reload
    await expect(async () => {
      await page.reload();
      await expect(scheduleLink(page)).toHaveText("Every minute");
      const [[shown]] = await tableRows(page);
      const [latest] = await latestRows(api, queryId);
      expect(shown).toBe(latest.ran_at_text);
      expect(shown).not.toBe(manualRow.ran_at_text);
    }).toPass({ timeout: 30_000 });
  });

  test("@slow stops refreshing once the schedule is set to Never", async ({ page, api }) => {
    test.setTimeout(5 * 60_000);
    await page.goto(`/queries/${queryId}`);
    const dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "Never");
    await confirmSchedule(page, dialog);
    await expect(scheduleLink(page)).toHaveText("Never");
    await expect.poll(async () => (await getQuery(api, queryId)).schedule).toBeNull();
    // The scheduler's latest look, from before the removal, may well have picked the query up
    const removedAt = (await lastRefreshRun(api)).at;

    // A run that was already enqueued when the schedule was removed may still finish; after that the result
    // must stay. Wait until the query would have been due again and the scheduler has looked twice since.
    let settled = await getQuery(api, queryId);
    await expect
      .poll(
        async () => {
          const query = await getQuery(api, queryId);
          const changed = query.latest_query_data_id !== settled.latest_query_data_id;
          settled = query;
          return changed;
        },
        { intervals: [5000], message: "no run is still in flight" }
      )
      .toBe(false);
    const dueAt = new Date(settled.retrieved_at as string).getTime() / 1000 + 60;
    const looks = new Set<number>();
    await expect
      .poll(
        async () => {
          const run = await lastRefreshRun(api);
          if (run.at > removedAt) {
            expect(run.queryIds, "the scheduler does not pick the query up any more").not.toContain(queryId);
          }
          if (run.at > dueAt) {
            looks.add(run.at);
          }
          return looks.size;
        },
        { timeout: 200_000, intervals: [5000], message: "the scheduler looks for due queries twice after the due time" }
      )
      .toBeGreaterThanOrEqual(2);

    const after = await getQuery(api, queryId);
    expect(after.latest_query_data_id).toBe(settled.latest_query_data_id);
    expect(after.retrieved_at).toBe(settled.retrieved_at);
  });
});
