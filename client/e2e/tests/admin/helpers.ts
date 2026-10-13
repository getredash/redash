import type { Browser, Locator, Page } from "@playwright/test";
import { expect, type Guard, type Mail, mailbox, type RedashApi, uniqueName } from "../../support/fixtures";

/** The page shown instead of a page the user may not open. */
export const NO_PERMISSION = /It seems like you don.t have permission to see this page\./;
/** The page shown for an object or route that does not exist. */
export const NOT_FOUND = /It seems like the page you.re looking for cannot be found\./;
/** The empty state of a list page whose search or filter matches nothing. */
export const NOTHING_FOUND = /Sorry, we couldn.t find anything\./;

/** How long the first page after a login may take to appear; the server is slow while many tests run. */
export const LOAD_TIMEOUT = 30_000;

export interface TestUser {
  id: number;
  name: string;
  email: string;
  password: string;
}

/** A unique `@example.com` address; mail to it ends up in the mail catcher. */
export function uniqueEmail(prefix: string): string {
  return `${uniqueName(prefix)
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}@example.com`;
}

/** A short unique word (letters and digits only) to put in names, so searches find only this test's objects. */
export function uniqueToken(prefix: string): string {
  return uniqueName(prefix)
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

/**
 * Creates an active user through the API (no invitation email) for tests that are not about inviting.
 * With `groupIds` the user is a member of exactly these groups; otherwise of "default" only.
 */
export async function createUser(
  api: RedashApi,
  options: { prefix: string; groupIds?: number[]; password?: string }
): Promise<TestUser> {
  const name = uniqueName(options.prefix);
  const email = uniqueEmail(options.prefix);
  const password = options.password || "e2e-throwaway-1";
  const user = await api.post("/api/users?no_invite", { name, email });
  await api.acceptInvite(user.invite_link, password);
  if (options.groupIds) {
    await api.post(`/api/users/${user.id}`, { group_ids: options.groupIds });
  }
  return { id: user.id, name, email, password };
}

/** Invites a user through the API (the invitation email is sent); the user stays pending. */
export async function inviteUserViaApi(
  api: RedashApi,
  prefix: string
): Promise<{ id: number; name: string; email: string }> {
  const name = uniqueName(prefix);
  const email = uniqueEmail(prefix);
  const user = await api.post("/api/users", { name, email });
  return { id: user.id, name, email };
}

/** Removes a user created by a test, whatever state it is in. Users who own objects can only be disabled. */
export async function removeUser(api: RedashApi, id: number) {
  await api.delete(`/api/users/${id}`).catch(async () => {
    await api.post(`/api/users/${id}/disable`).catch(() => undefined);
  });
}

/** A page of a new browser that is not logged in; watched by the guard and closed with the browser. */
export async function newAnonPage(browser: Browser, guard: Guard, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, baseURL });
  guard.watch(context);
  return context.newPage();
}

/** Fills and submits the login form on the page (which must be showing it). */
export async function submitLogin(page: Page, email: string, password: string) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

/** Logs a user in through the login form in a new browser context and returns its page. */
export async function loginAs(
  browser: Browser,
  guard: Guard,
  baseURL: string | undefined,
  user: { email: string; password: string }
): Promise<Page> {
  const page = await newAnonPage(browser, guard, baseURL);
  await page.goto("/login");
  await submitLogin(page, user.email, user.password);
  await expect(page).not.toHaveURL(/\/login/, { timeout: LOAD_TIMEOUT });
  await expect(page.locator('[data-test="ProfileDropdown"]')).toBeVisible({ timeout: LOAD_TIMEOUT });
  return page;
}

/** The user the page is logged in as, or the HTTP status when it is not. */
export async function sessionOf(page: Page): Promise<{ status: number; email?: string; name?: string }> {
  const response = await page.request.get("/api/session");
  if (!response.ok()) {
    return { status: response.status() };
  }
  const { user } = await response.json();
  return { status: response.status(), email: user.email, name: user.name };
}

/**
 * The path of the first link in the mail that matches. Links in emails point at the server's configured host,
 * which need not be the address the tests use, so only the path is taken.
 */
export function linkPath(mail: Mail, pattern: RegExp): string {
  const links = `${mail.html || ""} ${mail.text || ""}`.match(/https?:\/\/[^\s"'<>)]+/g) || [];
  const link = links.map((l) => l.replace(/&amp;/g, "&")).find((l) => pattern.test(l));
  if (!link) {
    throw new Error(`no link matching ${pattern} in the mail "${mail.subject}"`);
  }
  const url = new URL(link);
  return url.pathname + url.search;
}

/** All mails in the catcher that were sent to the address, oldest first. */
export async function mailsTo(address: string): Promise<Mail[]> {
  return (await mailbox.all()).filter(mailbox.sentTo(address));
}

/** Waits until the catcher holds `count` mails for the address and returns them, oldest first. */
export async function waitForMails(address: string, count: number): Promise<Mail[]> {
  let found: Mail[] = [];
  await expect(async () => {
    found = await mailsTo(address);
    expect(found.length, `emails to ${address} in the mail catcher`).toBeGreaterThanOrEqual(count);
  }).toPass({ timeout: 60_000 });
  return found;
}

// ---------- settings pages ----------

/** The tab of a settings list page (Users: Active/Pending/Disabled) or a group page (Members/Data Sources). */
export function menuItem(scope: Page | Locator, name: string | RegExp): Locator {
  return scope.getByRole("menuitem", { name });
}

/** The confirmation dialog (antd `Modal.confirm`) that is open. */
export function confirmDialog(page: Page): Locator {
  return page.locator(".ant-modal-confirm");
}

/** The dialog for picking members or data sources of a group. */
export function selectItemsDialog(page: Page): Locator {
  return page.locator(".select-items-dialog");
}

/** Opens the "Add Members"/"Add Data Sources" dialog, searches, picks the item with the given text and saves. */
export async function addToGroup(page: Page, button: RegExp, search: string, item: string) {
  await page.getByRole("button", { name: button }).first().click();
  const dialog = selectItemsDialog(page);
  await dialog.locator("input").click();
  await page.keyboard.type(search);
  await dialog.locator(".ant-modal-body").getByText(item, { exact: true }).first().click();
  await dialog.locator(".ant-modal-footer .ant-btn-primary").click();
  await expect(dialog).toBeHidden();
}

// ---------- list pages ----------

/**
 * Rows of the list table on the page. Ignores antd's hidden measuring row, the empty placeholder and the
 * grey skeleton rows shown while the list is loading - so a count of 0 can also mean "still loading": use
 * `expectNothingFound` to assert that a list is empty.
 */
export function listRows(scope: Page | Locator): Locator {
  return scope.locator("table tbody tr.ant-table-row:not(:has(.ant-skeleton))");
}

/** The name link of each row, in the order shown. */
export async function listNames(scope: Page | Locator): Promise<string[]> {
  const names = await listRows(scope).locator("a.table-main-title").allInnerTexts();
  return names.map((name) => name.trim());
}

/**
 * Replaces the term in a list's search box by typing over it and waits until the list was fetched with it.
 * (Typing over the selected old term, not clearing first: see the fixme about lost characters in search.spec.ts.)
 */
export async function searchFor(page: Page, placeholder: string, term: string) {
  const box = page.getByPlaceholder(placeholder);
  const fetched = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.startsWith("/api/") && url.searchParams.get("q") === term;
  });
  await box.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(term);
  await expect(box).toHaveValue(term);
  await fetched;
  // The term is put in the URL when the debounced search has been applied
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(term);
}

/** Clicks a sortable column header. */
export async function sortBy(page: Page, column: string) {
  await page
    .locator("thead th.ant-table-column-has-sorters")
    .filter({ hasText: new RegExp(`^\\s*${column}\\s*$`) })
    .click();
}

/** Picks a page size in the pager of a list. */
export async function setPageSize(page: Page, size: number) {
  await page.locator(".ant-pagination-options .ant-select-selector").click();
  await page
    .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option")
    .filter({ hasText: new RegExp(`^${size} / page`) })
    .click();
}

/** Case-insensitive comparison the way the server orders names (`lower(name)`). */
export function byLowerCase(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

// ---------- users with limited access ----------

export type StorageState = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;

/** Logs in through the login form once and returns the session, for opening several pages as that user. */
export async function loginState(
  browser: Browser,
  baseURL: string | undefined,
  user: { email: string; password: string }
): Promise<StorageState> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await submitLogin(page, user.email, user.password);
    await expect(page.locator('[data-test="ProfileDropdown"]')).toBeVisible({ timeout: LOAD_TIMEOUT });
    return await context.storageState();
  } finally {
    await context.close();
  }
}

/** A page of a new browser context with a saved session; watched by the guard and closed with the browser. */
export async function pageAs(
  browser: Browser,
  guard: Guard,
  baseURL: string | undefined,
  storageState: StorageState
): Promise<Page> {
  const context = await browser.newContext({ storageState, baseURL });
  guard.watch(context);
  return context.newPage();
}

/**
 * A group with access to the PostgreSQL data source only (view-only unless `viewOnly` is false) and a user who
 * is a member of only that group. (The seeded viewer cannot be used for this: see the note in the report.)
 */
export async function createLimitedUser(
  api: RedashApi,
  postgresId: number,
  options: { prefix: string; viewOnly?: boolean }
): Promise<{ user: TestUser; group: { id: number; name: string } }> {
  const group = await api.post("/api/groups", { name: uniqueName(`${options.prefix} group`) });
  await api.post(`/api/groups/${group.id}/data_sources`, { data_source_id: postgresId });
  await api.post(`/api/groups/${group.id}/data_sources/${postgresId}`, { view_only: options.viewOnly !== false });
  const user = await createUser(api, { prefix: options.prefix, groupIds: [group.id] });
  return { user, group: { id: group.id, name: group.name } };
}

/** HTTP status of an API request made with the page's session (and its CSRF token). */
export async function apiStatus(page: Page, method: "GET" | "POST" | "DELETE", url: string, data?: unknown) {
  const cookies = await page.context().cookies();
  const csrf = cookies.find((cookie) => cookie.name === "csrf_token")?.value || "";
  const response = await page.request.fetch(url, { method, data, headers: { "X-CSRFToken": csrf } });
  return response.status();
}

/** A dashboard with one widget per query (their default table visualizations), published. */
export async function createDashboardViaApi(
  api: RedashApi,
  name: string,
  queryIds: number[],
  options: { tags?: string[]; draft?: boolean } = {}
): Promise<{ id: number; name: string }> {
  const dashboard = await api.post("/api/dashboards", { name });
  for (const [index, queryId] of queryIds.entries()) {
    const query = await api.get(`/api/queries/${queryId}`);
    await api.post("/api/widgets", {
      dashboard_id: dashboard.id,
      visualization_id: query.visualizations[0].id,
      text: "",
      width: 1,
      options: { position: { col: (index % 2) * 3, row: Math.floor(index / 2) * 8, sizeX: 3, sizeY: 8 } },
    });
  }
  await api.post(`/api/dashboards/${dashboard.id}`, {
    is_draft: !!options.draft,
    ...(options.tags ? { tags: options.tags } : {}),
  });
  return { id: dashboard.id, name };
}

/**
 * The row with the given text in a list that has no search box (groups, group members), looking through its
 * pages. With `exact` the row's link must have exactly that text. Returns the row on the page where it is.
 */
export async function findRow(page: Page, text: string, options: { exact?: boolean } = {}): Promise<Locator> {
  const row = options.exact
    ? listRows(page).filter({ has: page.getByRole("link", { name: text, exact: true }) })
    : listRows(page).filter({ hasText: text });
  await expect(listRows(page).first()).toBeVisible();
  const first = page.locator(".ant-pagination-item-1:not(.ant-pagination-item-active)");
  if ((await first.count()) > 0) {
    await first.click();
  }
  for (let pages = 0; pages < 50; pages += 1) {
    if ((await row.count()) > 0) {
      return row;
    }
    const next = page.locator("li.ant-pagination-next:not(.ant-pagination-disabled)");
    if ((await next.count()) === 0) {
      break;
    }
    const before = await listRows(page).first().innerText();
    await next.click();
    await expect(listRows(page).first()).not.toHaveText(before);
  }
  throw new Error(`no row with "${text}" on any page of the list`);
}

/** Runs SQL through the API as the admin and returns the result rows. */
export async function runSqlViaApi(
  api: RedashApi,
  dataSourceId: number,
  sql: string
): Promise<Record<string, unknown>[]> {
  let response = await api.post("/api/query_results", { query: sql, data_source_id: dataSourceId, max_age: 0 });
  const deadline = Date.now() + 60_000;
  while (response.job && response.job.status < 3 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    response = await api.get(`/api/jobs/${response.job.id}`);
  }
  if (response.job) {
    if (response.job.status !== 3) {
      throw new Error(`"${sql}" failed: ${response.job.error}`);
    }
    response = await api.get(`/api/query_results/${response.job.query_result_id}`);
  }
  return response.query_result.data.rows;
}

/** Waits until the list shows exactly these names; in this order when `ordered`, otherwise in any order. */
export async function expectNames(page: Page, names: string[], options: { ordered?: boolean } = {}) {
  const sorted = (list: string[]) => (options.ordered ? list : [...list].sort());
  await expect
    .poll(async () => sorted(await listNames(page)), { message: `names in the list at ${page.url()}` })
    .toEqual(sorted(names));
}

/** Waits until the list at this URL finished loading with no rows, showing the "nothing found" message. */
export async function expectNothingFound(page: Page) {
  await expect(page.getByText(NOTHING_FOUND)).toBeVisible();
  await expect(listRows(page)).toHaveCount(0);
}

/** Creates a published query as the user of a saved session (the `api` fixture is always the admin). */
export async function createQueryAs(
  browser: Browser,
  baseURL: string | undefined,
  session: StorageState,
  query: { name: string; dataSourceId: number; sql: string }
): Promise<number> {
  const context = await browser.newContext({ storageState: session, baseURL });
  try {
    const csrf = session.cookies.find((cookie) => cookie.name === "csrf_token")?.value || "";
    const headers = { "X-CSRFToken": csrf };
    const created = await context.request.post("/api/queries", {
      headers,
      data: { name: query.name, query: query.sql, data_source_id: query.dataSourceId, options: {} },
    });
    expect(created.ok(), `creating the query "${query.name}"`).toBe(true);
    const { id } = await created.json();
    const published = await context.request.post(`/api/queries/${id}`, { headers, data: { is_draft: false } });
    expect(published.ok()).toBe(true);
    return id;
  } finally {
    await context.close();
  }
}

/** POST to the API as the user of a saved session (the `api` fixture is always the admin). */
export async function postAs(browser: Browser, baseURL: string | undefined, session: StorageState, url: string) {
  const context = await browser.newContext({ storageState: session, baseURL });
  try {
    const csrf = session.cookies.find((cookie) => cookie.name === "csrf_token")?.value || "";
    const response = await context.request.post(url, { headers: { "X-CSRFToken": csrf }, data: {} });
    expect(response.ok(), `POST ${url}`).toBe(true);
  } finally {
    await context.close();
  }
}

/**
 * Matches the URL of a page whatever its query string: list pages add their state (`?order=...&page=1...`)
 * to the URL as soon as they are shown.
 */
export function atPath(path: string): RegExp {
  return new RegExp(`:\\d+${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\?.*)?$`);
}
