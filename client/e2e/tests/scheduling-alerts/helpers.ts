import type { Locator, Page } from "@playwright/test";
import { INTERNAL } from "../../support/env";
import { expect, type RedashApi, uniqueName } from "../../support/fixtures";
import { byTest, pick, selectOptions } from "../../support/ui";

// ---------- API helpers ----------

export interface Schedule {
  interval: number | null;
  time: string | null;
  day_of_week: string | null;
  until: string | null;
}

export interface QueryInfo {
  id: number;
  name: string;
  schedule: Schedule | null;
  retrieved_at: string | null;
  latest_query_data_id: number | null;
  updated_at: string;
  options: { parameters?: { name: string; value: unknown }[] };
}

export interface AlertInfo {
  id: number;
  name: string;
  state: "unknown" | "ok" | "triggered";
  rearm: number | null;
  last_triggered_at: string | null;
  options: {
    column: string;
    op: string;
    value: number | string;
    selector?: string;
    muted?: boolean;
    custom_subject?: string | null;
    custom_body?: string | null;
  };
}

interface Job {
  id: string;
  status: number;
  error?: unknown;
  query_result_id?: number;
  result?: unknown;
}

/** The query, with `retrieved_at` of its latest result (which only the list API includes; null without a result). */
export async function getQuery(api: RedashApi, id: number): Promise<QueryInfo> {
  const query = await api.get<QueryInfo>(`/api/queries/${id}`);
  const resultId = query.latest_query_data_id;
  const result = resultId === null ? null : (await api.get(`/api/query_results/${resultId}`)).query_result;
  return { ...query, retrieved_at: result ? result.retrieved_at : null };
}
export const getAlert = (api: RedashApi, id: number) => api.get<AlertInfo>(`/api/alerts/${id}`);

/** Waits until a background job is over (3 = finished, 4 = failed, 5 = cancelled) and returns it. */
export async function waitForJob(api: RedashApi, job: Job, timeout = 90_000): Promise<Job> {
  let current = job;
  await expect
    .poll(
      async () => {
        current = (await api.get(`/api/jobs/${current.id}`)).job;
        return current.status;
      },
      { timeout, intervals: [300, 500, 1000], message: "the background job finishes" }
    )
    .toBeGreaterThanOrEqual(3);
  return current;
}

/** Runs SQL on a data source through the query results API (not a saved query) and returns the rows. */
export async function runSql(api: RedashApi, dataSourceId: number, sql: string): Promise<Record<string, unknown>[]> {
  const started = await api.post("/api/query_results", { data_source_id: dataSourceId, query: sql, max_age: 0 });
  const job = await waitForJob(api, started.job);
  if (job.status !== 3) {
    throw new Error(`SQL failed: ${sql}\n${JSON.stringify(job.error)}`);
  }
  const id = job.query_result_id ?? job.result;
  return (await api.get(`/api/query_results/${id}`)).query_result.data.rows;
}

/** The clock of the servers (which is not necessarily the clock of the machine running the tests), in ms. */
export async function serverTime(api: RedashApi, postgresId: number): Promise<number> {
  const [row] = await runSql(api, postgresId, "select extract(epoch from clock_timestamp()) * 1000 as now_ms");
  return Number(row.now_ms);
}

/** Runs a saved query now, the way the Refresh button does, and waits for the new result. */
export async function refreshQuery(api: RedashApi, queryId: number) {
  const started = await api.post(`/api/queries/${queryId}/results`, { max_age: 0 });
  const job = await waitForJob(api, started.job);
  expect(job.status, `the refresh of query ${queryId} finishes`).toBe(3);
}

/** The rows of the latest result of a saved query. */
export async function latestRows(api: RedashApi, queryId: number): Promise<Record<string, unknown>[]> {
  const { latest_query_data_id: id } = await api.get<QueryInfo>(`/api/queries/${queryId}`);
  return (await api.get(`/api/query_results/${id}`)).query_result.data.rows;
}

export const setSchedule = (api: RedashApi, queryId: number, schedule: Schedule | null) =>
  api.post(`/api/queries/${queryId}`, { schedule });

export const everyMinute: Schedule = { interval: 60, time: null, day_of_week: null, until: null };

/**
 * Things a spec created and must not leave behind: a scheduled query or an alert would keep running on the
 * instance. Call `cleanup` from `afterAll`; it never throws.
 */
export class Created {
  readonly queries: number[] = [];
  readonly alerts: number[] = [];
  readonly destinations: number[] = [];
  readonly tables: string[] = [];

  async cleanup(api: RedashApi, postgresId: number) {
    const quietly = (action: Promise<unknown>) => action.catch(() => undefined);
    for (const id of this.alerts) {
      await quietly(api.delete(`/api/alerts/${id}`));
    }
    for (const id of this.queries) {
      await quietly(setSchedule(api, id, null));
      await quietly(api.delete(`/api/queries/${id}`)); // archives it
    }
    for (const id of this.destinations) {
      await quietly(api.delete(`/api/destinations/${id}`));
    }
    for (const table of this.tables) {
      await quietly(runSql(api, postgresId, `drop table if exists ${table}; select 1 as dropped`));
    }
  }
}

/** A table with one row `(v, label)` that the test can change, and the name to use in SQL. */
export async function createValueTable(api: RedashApi, postgresId: number, created: Created): Promise<string> {
  const table = `e2e_s_${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
  created.tables.push(table);
  await runSql(
    api,
    postgresId,
    `create table ${table} (v int, label text); insert into ${table} values (5, 'low') returning v, label`
  );
  return table;
}

export const setValue = (api: RedashApi, postgresId: number, table: string, v: number, label: string) =>
  runSql(api, postgresId, `update ${table} set v = ${v}, label = '${label}' returning v, label`);

export async function createAlertViaApi(
  api: RedashApi,
  created: Created,
  alert: { name: string; queryId: number; options?: Partial<AlertInfo["options"]>; rearm?: number | null }
): Promise<AlertInfo> {
  const result = await api.post<AlertInfo>("/api/alerts", {
    name: alert.name,
    query_id: alert.queryId,
    rearm: alert.rearm ?? null,
    options: { selector: "first", column: "v", op: ">", value: 10, muted: false, ...alert.options },
  });
  created.alerts.push(result.id);
  return result;
}

export async function createDestinationViaApi(
  api: RedashApi,
  created: Created,
  destination: { name: string; type: "email" | "webhook"; options: Record<string, string> }
): Promise<{ id: number; name: string }> {
  const result = await api.post("/api/destinations", destination);
  created.destinations.push(result.id);
  return result;
}

/** An Email and a Webhook destination with addresses and a path nobody else uses. */
export async function createDestinationPair(api: RedashApi, created: Created) {
  const tag = uniqueName("s").replace(/\s+/g, "-");
  const addresses = [`${tag}-first@example.com`, `${tag}-second@example.com`];
  const hookPath = `/hook-${tag}`;
  const email = await createDestinationViaApi(api, created, {
    name: uniqueName("S email destination"),
    type: "email",
    options: { addresses: addresses.join(",") },
  });
  const webhook = await createDestinationViaApi(api, created, {
    name: uniqueName("S webhook destination"),
    type: "webhook",
    options: { url: `${INTERNAL.http}${hookPath}` },
  });
  return { email, webhook, addresses, hookPath };
}

export const subscribe = (api: RedashApi, alertId: number, destinationId?: number) =>
  api.post(`/api/alerts/${alertId}/subscriptions`, destinationId ? { destination_id: destinationId } : {});

/** Who is notified by the alert: destination names, and `user:<email>` for a plain email subscription. */
export async function subscriptions(api: RedashApi, alertId: number): Promise<string[]> {
  const subs: { destination?: { name: string }; user: { email: string } }[] = await api.get(
    `/api/alerts/${alertId}/subscriptions`
  );
  return subs.map((sub) => (sub.destination ? sub.destination.name : `user:${sub.user.email}`)).sort();
}

/** The refresh job of the scheduler: when it last ran and which queries it enqueued then. */
export async function lastRefreshRun(api: RedashApi): Promise<{ at: number; queryIds: number[] }> {
  const { queries, updated_at } = await api.get("/api/admin/queries/outdated");
  return { at: Number.parseFloat(updated_at), queryIds: queries.map((query: { id: number }) => query.id) };
}

// ---------- the Refresh Schedule dialog ----------

export const scheduleLink = (page: Page) => byTest(page, "EditSchedule").first();
export const scheduleDialog = (page: Page) => page.locator(".ant-modal.schedule");

export async function openScheduleDialog(page: Page): Promise<Locator> {
  await scheduleLink(page).click();
  const dialog = scheduleDialog(page);
  await expect(dialog.locator(".ant-modal-title")).toHaveText("Refresh Schedule");
  return dialog;
}

export const intervalSelect = (dialog: Locator) => dialog.locator('[data-testid="interval"] .ant-select');

/**
 * Picks an interval in the open dialog. The list is long and virtual (only the rows in view exist), so this
 * turns the mouse wheel over it until the option shows up, as a user would scroll.
 */
export async function pickInterval(page: Page, dialog: Locator, label: string) {
  await intervalSelect(dialog).locator(".ant-select-selector").click();
  const dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
  await expect(dropdown).toBeVisible();
  const option = selectOptions(page).filter({ hasText: new RegExp(`^${label}$`) });
  const box = await dropdown.boundingBox();
  if (!box) {
    throw new Error("the interval list is not visible");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // Down to the end of the list first, then all the way back up
  for (const delta of [...new Array(25).fill(100), ...new Array(50).fill(-100)]) {
    if ((await option.count()) > 0) {
      break;
    }
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(60); // one wheel notch at a time: the list renders the next rows in between
  }
  await option.click();
  await expect(dropdown).toBeHidden();
  await expect(intervalSelect(dialog).locator(".ant-select-selection-item")).toHaveText(label);
}

/** Chooses hour and minute in the dialog's time picker. */
export async function pickTime(page: Page, dialog: Locator, hour: string, minute: string) {
  await dialog.locator('[data-testid="time"] .ant-picker').click();
  const panel = page.locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)");
  const columns = panel.locator(".ant-picker-time-panel-column");
  await columns.nth(0).locator("li").filter({ hasText: hour }).click();
  await columns.nth(1).locator("li").filter({ hasText: minute }).click();
  await panel.locator(".ant-picker-ok button").click();
  await expect(panel).toBeHidden();
  await expect(dialog.locator('[data-testid="time"] input')).toHaveValue(`${hour}:${minute}`);
}

/** Presses OK and waits until the dialog is gone. */
export async function confirmSchedule(page: Page, dialog: Locator) {
  await dialog.locator(".ant-modal-footer .ant-btn-primary").click();
  await expect(dialog).toBeHidden();
}

/** The full sentence shown when the pointer rests on the schedule in the page footer. */
export async function scheduleTooltip(page: Page): Promise<Locator> {
  // Leave and come back, so the tooltip is the one for the current text
  await page.mouse.move(0, 0);
  await scheduleLink(page).hover();
  return page.locator(".ant-tooltip:not(.ant-tooltip-hidden) .ant-tooltip-inner");
}

/** What the browser shows for a time of day stored in UTC ("11:35" -> "14:35" in Asia/Jerusalem summer time). */
export async function utcToBrowserTime(page: Page, utc: string): Promise<string> {
  return page.evaluate((value) => {
    const [hour, minute] = value.split(":").map(Number);
    const date = new Date();
    date.setUTCHours(hour, minute, 0, 0);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }, utc);
}

/** The UTC time of day for a time the user picked in the browser's timezone. */
export async function browserTimeToUtc(page: Page, local: string): Promise<string> {
  return page.evaluate((value) => {
    const [hour, minute] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  }, local);
}

// ---------- alert pages ----------

/** The n-th dropdown of "Trigger when": 0 selector, 1 value column, 2 condition. */
export const criteriaSelect = (page: Page, index: number) => byTest(page, "Criteria").locator(".ant-select").nth(index);
export const criteriaHint = (page: Page) => byTest(page, "Criteria").locator(".ant-form-item-explain");
export const threshold = (page: Page) => page.locator("#threshold-criterion");
/** The values of "Trigger when" in view mode: selector, value column, condition, threshold. */
export const criteriaShown = (page: Page) => byTest(page, "Criteria").locator(".criteria-disabled-input");
export const alertState = (page: Page) => page.locator(".alert-state");

export async function openAlert(page: Page, alertId: number) {
  await page.goto(`/alerts/${alertId}`);
  await expect(alertState(page)).toBeVisible();
  await expect(byTest(page, "Criteria")).toBeVisible();
}

export async function startEditing(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/alerts\/\d+\/edit$/);
  await expect(page.locator(".alert-rearm")).toBeVisible();
}

export async function saveAlert(page: Page) {
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page).toHaveURL(/\/alerts\/\d+$/);
  await expect(alertState(page)).toBeVisible();
}

/** Chooses an item of the "..." menu on the alert page. */
export async function alertMenu(page: Page, item: string) {
  await page.getByRole("button", { name: "More actions" }).click();
  await page
    .locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item")
    .filter({ hasText: new RegExp(`^\\s*${item}\\s*$`) })
    .click();
}

/** The row of an alert on the Alerts list page. */
export const alertRow = (page: Page, name: string) => page.locator("tbody tr").filter({ hasText: name });

export { pick };
