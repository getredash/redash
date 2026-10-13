import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { createQueryViaApi } from "../../support/ui";
import { Created, everyMinute, lastRefreshRun, setSchedule, waitForJob } from "./helpers";

const card = (page: Page, title: string) =>
  page.locator(".ant-card").filter({ has: page.getByText(title, { exact: true }) });
const item = (scope: Locator, name: string) => scope.locator(".ant-list-item").filter({ hasText: name });
const adminTab = (page: Page, name: string) =>
  page.locator(".admin-page-layout .ant-menu-item a").filter({ hasText: name });
const activePane = (page: Page) => page.locator(".ant-tabs-tabpane-active");

test.describe("Admin status pages", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("System Status shows the counters, version, manager and queues of /status.json", async ({ page }) => {
    const loaded = page.waitForResponse((response) => response.url().endsWith("/status.json"));
    await page.goto("/admin/status");
    const status = await (await loaded).json();
    expect(status.version).toMatch(/^\d+\.\d+\.\d+/);

    // General: every counter of the response, with its value
    const general = card(page, "General");
    await expect(item(general, "Version").locator(".badge")).toHaveText(status.version);
    for (const [label, key] of [
      ["Dashboards Count", "dashboards_count"],
      ["Queries Count", "queries_count"],
      ["Query Results Count", "query_results_count"],
      ["Unused Query Results Count", "unused_query_results_count"],
      ["Widgets Count", "widgets_count"],
      ["Redis Used Memory Human", "redis_used_memory_human"],
    ]) {
      await expect(item(general, label).locator(".badge").first(), label).toHaveText(String(status[key]));
    }
    expect(status.queries_count).toBeGreaterThan(0);
    expect(status.query_results_count).toBeGreaterThan(0);

    // Manager: the scheduler's refresh job reported recently (it runs every 30 s)
    const manager = card(page, "Manager");
    await expect(item(manager, "Last Refresh").locator(".badge")).toHaveText(/just now|seconds ago|a minute ago/);
    await expect(item(manager, "Started").locator(".badge")).toHaveText(/just now|seconds ago|a minute ago/);
    await expect(item(manager, "Outdated Queries Count").locator(".badge")).toHaveText(
      String(status.manager.outdated_queries_count)
    );

    // Queues: one line per queue with its size
    const queues = card(page, "Queues");
    const names = Object.keys(status.manager.queues);
    expect(names).toEqual(expect.arrayContaining(["default", "periodic", "queries"]));
    await expect(queues.locator(".ant-list-item")).toHaveCount(names.length);
    for (const name of names) {
      await expect(queues.locator(".ant-list-item").filter({ hasText: new RegExp(`^${name}\\d+$`) })).toHaveCount(1);
    }

    // Redash Database: sizes, human readable
    const database = card(page, "Redash Database");
    await expect(item(database, "Query Results Size").locator(".badge")).toHaveText(/^[\d.]+ ?(bytes|[KMGT]i?B)$/i);
    await expect(item(database, "Redash DB Size").locator(".badge")).toHaveText(/^[\d.]+ ?(bytes|[KMGT]i?B)$/i);

    // The three admin pages are linked
    await expect(page.locator(".admin-page-layout .ant-menu-item a")).toHaveText([
      "System Status",
      "RQ Status",
      "Outdated Queries",
    ]);
  });

  test("RQ Status shows the queues, a busy worker and the started job while a query runs", async ({
    page,
    api,
    seed,
  }) => {
    const { id: queryId } = await createQueryViaApi(api, {
      name: uniqueName("S sleep"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select pg_sleep(25), now() as finished_at",
      run: false,
    });
    created.queries.push(queryId);
    const { job } = await api.post(`/api/queries/${queryId}/results`, { max_age: 0 });
    const startedJobs = async () => {
      const status = await api.get("/api/admin/queries/rq_status");
      return Object.values(status.queues as Record<string, { started: { id: string }[] }>)
        .flatMap((queue) => queue.started)
        .filter((started) => started.id === job.id).length;
    };
    // Both workers may be busy with other tests' queries for a while
    await expect.poll(startedJobs, { timeout: 90_000, message: "a worker picks the slow query up" }).toBe(1);

    await page.goto("/admin/status");
    const loaded = page.waitForResponse((response) => response.url().endsWith("/api/admin/queries/rq_status"));
    await adminTab(page, "RQ Status").click();
    await expect(page).toHaveURL(/\/admin\/queries\/jobs$/);
    const rq = await (await loaded).json();

    // Counters
    const startedTotal = Object.values(rq.queues as Record<string, { started: unknown[] }>).reduce(
      (sum, queue) => sum + queue.started.length,
      0
    );
    expect(startedTotal).toBeGreaterThanOrEqual(1);
    await expect(page.locator(".ant-card").filter({ hasText: "Started Jobs" }).locator(".f-20")).toHaveText(
      String(startedTotal)
    );
    await expect(page.locator(".ant-card").filter({ hasText: "Queued Jobs" }).locator(".f-20")).toHaveText(/^\d+$/);

    // Queues tab (the default): every queue, and "queries" has a started job
    const rows = activePane(page).locator("tbody tr.ant-table-row");
    await expect(page.locator(".ant-tabs-tab-active")).toHaveText("Queues");
    await expect(rows).toHaveCount(Object.keys(rq.queues).length);
    const queriesRow = rows.filter({ has: page.locator("td:first-child", { hasText: /^queries$/ }) });
    await expect(queriesRow.locator("td").nth(1)).toHaveText(String(rq.queues.queries.started.length));
    expect(rq.queues.queries.started.length).toBeGreaterThanOrEqual(1);

    // Workers tab: one of them is busy with the query's job
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: /^Workers$/ })
      .click();
    await expect(page).toHaveURL(/#workers$/);
    await expect(rows).toHaveCount(rq.workers.length);
    const busy = rows.filter({ hasText: job.id });
    await expect(busy).toHaveCount(1);
    await expect(busy.locator("td").first()).toHaveText("busy");
    await expect(busy).toContainText(`${job.id} (execute_query)`);
    await expect(busy).toContainText("queries");

    // Queries tab: the started job of this query
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: /^Queries$/ })
      .click();
    await expect(page).toHaveURL(/#queries$/);
    const mine = rows.filter({ has: page.locator("td:nth-child(2)", { hasText: new RegExp(`^${queryId}$`) }) });
    await expect(mine).toHaveCount(1);
    const cells = mine.locator("td");
    await expect(cells.nth(0)).toHaveText("queries");
    await expect(cells.nth(3)).toHaveText(String(seed.dataSources.postgres));
    await expect(cells.nth(4)).toHaveText(String(seed.adminId));
    await expect(cells.nth(5)).toHaveText("false");
    await expect(cells.nth(6)).toHaveText(/just now|seconds ago|a minute ago/);

    // Other Jobs tab has its own table
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: /^Other Jobs$/ })
      .click();
    await expect(page).toHaveURL(/#other$/);
    await expect(activePane(page).locator("thead th")).toHaveText(["Queue", "Job Name", "Start Time", "Enqueue Time"]);

    // When the query is over, its job is gone and no worker holds it. The tab is kept in the URL.
    expect((await waitForJob(api, job)).status).toBe(3);
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: /^Queries$/ })
      .click();
    await expect(page).toHaveURL(/#queries$/);
    await page.reload();
    await expect(page.locator(".ant-tabs-tab-active")).toHaveText("Queries");
    await expect(activePane(page).locator(".ant-spin-spinning")).toHaveCount(0);
    await expect(activePane(page).locator("thead th").first()).toHaveText("Queue");
    await expect(mine).toHaveCount(0);
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: /^Workers$/ })
      .click();
    await expect(rows).toHaveCount(rq.workers.length);
    await expect(rows.filter({ hasText: job.id })).toHaveCount(0);
  });

  test("@slow Outdated Queries lists a query whose schedule is due", async ({ page, api, seed }) => {
    test.setTimeout(5 * 60_000);
    const name = uniqueName("S outdated");
    const { id } = await createQueryViaApi(api, {
      name,
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as one",
      run: false,
    });
    created.queries.push(id);
    await setSchedule(api, id, everyMinute);

    const statuses: number[] = [];
    page.on("response", (response) => {
      if (response.url().endsWith("/api/admin/queries/outdated")) {
        statuses.push(response.status());
      }
    });
    await page.goto("/admin/status");
    await adminTab(page, "Outdated Queries").click();
    await expect(page).toHaveURL(/\/admin\/queries\/outdated$/);
    await expect(page.getByText("Auto update")).toBeVisible();
    await expect(
      page.getByText(/Last updated:\s*(just now|\d+ seconds ago|a few seconds ago|a minute ago)/)
    ).toBeVisible();
    // Either the table or the empty message, never an error
    await expect(page.locator("tbody tr").first().or(page.getByText("There are no outdated queries."))).toBeVisible();

    // The page lists what the scheduler's latest refresh run picked up: the query is there for the 30 s after
    // it came due, about once every 90 s
    const row = page.locator("tbody tr").filter({ hasText: name });
    await expect(async () => {
      await expect
        .poll(async () => (await lastRefreshRun(api)).queryIds, { timeout: 120_000, intervals: [2000] })
        .toContain(id);
      await page.reload();
      await expect(row).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 240_000 });
    await expect(row.locator("a.table-main-title")).toHaveAttribute("href", `queries/${id}`);
    await expect(row.locator("td").first()).toHaveText(String(id));
    await expect(row.locator("td").last()).toHaveText("Every minute");

    expect(statuses.length).toBeGreaterThan(1);
    expect(new Set(statuses), "every request for the list succeeded").toEqual(new Set([200]));
  });

  test("Outdated Queries updates itself every minute only while 'Auto update' is on", async ({ page }) => {
    await page.clock.install();
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/admin/queries/outdated")) {
        requests += 1;
      }
    });
    await page.goto("/admin/queries/outdated");
    const autoUpdate = page.getByRole("switch");
    await expect(autoUpdate).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(/Last updated:/)).toBeVisible();
    expect(requests).toBe(1);

    // On: one request per minute
    await page.clock.fastForward(61_000);
    await expect.poll(() => requests).toBe(2);

    // Off: the minute passes without a request
    await page.getByText("Auto update").click();
    await expect(autoUpdate).toHaveAttribute("aria-checked", "false");
    await page.clock.fastForward(61_000);
    await page.clock.fastForward(61_000);

    // On again: the next minute brings exactly one more
    await autoUpdate.click();
    await expect(autoUpdate).toHaveAttribute("aria-checked", "true");
    await page.clock.fastForward(61_000);
    await expect.poll(() => requests).toBe(3);
  });
});
