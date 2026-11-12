import type { Page } from "@playwright/test";
import { expect, type RedashApi, test } from "../../support/fixtures";
import { createQueryViaApi } from "../../support/ui";
import {
  byLowerCase,
  createLimitedUser,
  createQueryAs,
  expectNames,
  expectNothingFound,
  listNames,
  listRows,
  loginState,
  pageAs,
  removeUser,
  searchFor,
  setPageSize,
  sortBy,
  type StorageState,
  type TestUser,
  uniqueToken,
} from "./helpers";

const BOX = "Search Queries...";
/** Indexes (in `names`) of the queries that have been executed, in the order of execution. */
const EXECUTED = [7, 2, 9, 3, 10];

interface ListedQuery {
  id: number;
  name: string;
  created_at: string;
  retrieved_at: string | null;
  schedule: { interval: number } | null;
  is_favorite: boolean;
}

/** The `order` parameter in the URL: the list keeps its sort order there. */
const orderOf = (page: Page) => new URL(page.url()).searchParams.get("order");

/**
 * All lists here are filtered by a token that only this run's queries have in their names, so the rows (and
 * their number) are known whatever else is on the instance.
 */
test.describe("Queries list", () => {
  const token = uniqueToken("aql");
  // 12 queries; "a ... lowercase" shows that names sort case-insensitively
  const names = [
    `A ${token} Alpha`,
    `A ${token} Bravo`,
    `a ${token} charlie lowercase`,
    `A ${token} Delta`,
    `A ${token} Echo`,
    `A ${token} Foxtrot`,
    `A ${token} Golf`,
    `A ${token} Hotel`,
    `A ${token} India`,
    `A ${token} Juliett`,
    `A ${token} Kilo`,
    `A ${token} Lima`,
  ];
  const tagFinance = `${token}-finance`;
  const tagOps = `${token}-ops`;
  const archivedName = `A ${token} Zulu archived`;
  const otherUsersName = `A ${token} Yankee of another user`;
  const ids: number[] = [];
  let other: TestUser;
  let otherGroupId = 0;
  let otherSession: StorageState;

  const listed = async (api: RedashApi, path = "/api/queries"): Promise<ListedQuery[]> =>
    (await api.get(path, { q: token, page_size: 250 })).results;

  test.beforeAll(async ({ api, seed, browser, baseURL }) => {
    for (const [index, name] of names.entries()) {
      const tags = index < 4 ? [tagFinance] : index === 4 ? [tagFinance, tagOps] : index === 5 ? [tagOps] : [];
      const query = await createQueryViaApi(api, {
        name,
        dataSourceId: seed.dataSources.postgres,
        // Unique SQL: queries with the same text share their latest result, and so their "last executed" time
        sql: `select ${index} as ${token}`,
        tags,
        run: false,
      });
      ids.push(query.id);
    }
    // Five have been executed, in an order that differs from the order of creation and of the names
    for (const index of EXECUTED) {
      const execution = await api.post(`/api/queries/${ids[index]}/results`, { max_age: 0 });
      await api.waitForExecution(execution, names[index]);
    }
    // Two have a refresh schedule (daily and weekly). They were just executed, so the scheduler leaves them alone
    await api.post(`/api/queries/${ids[3]}`, {
      schedule: { interval: 604800, time: "00:15", day_of_week: "Monday", until: null },
    });
    await api.post(`/api/queries/${ids[10]}`, {
      schedule: { interval: 86400, time: "00:15", day_of_week: null, until: null },
    });
    await api.post(`/api/queries/${ids[0]}/favorite`);
    await api.post(`/api/queries/${ids[5]}/favorite`);

    const archived = await createQueryViaApi(api, {
      name: archivedName,
      dataSourceId: seed.dataSources.postgres,
      sql: `select 100 as ${token}`,
      run: false,
    });
    ids.push(archived.id);
    await api.delete(`/api/queries/${archived.id}`);

    // A query of another user, who may use the PostgreSQL data source
    const limited = await createLimitedUser(api, seed.dataSources.postgres, { prefix: "A Lists", viewOnly: false });
    other = limited.user;
    otherGroupId = limited.group.id;
    otherSession = await loginState(browser, baseURL, other);
    ids.push(
      await createQueryAs(browser, baseURL, otherSession, {
        name: otherUsersName,
        dataSourceId: seed.dataSources.postgres,
        sql: `select 101 as ${token}`,
      })
    );
  });

  test.afterAll(async ({ api }) => {
    for (const id of ids) {
      // Archiving also removes the schedule
      await api.delete(`/api/queries/${id}`).catch(() => undefined);
    }
    await removeUser(api, other.id);
    await api.delete(`/api/groups/${otherGroupId}`).catch(() => undefined);
  });

  test("only Name, Created At, Last Executed At and Refresh Schedule can be sorted", async ({ page }) => {
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(13);
    const headers = await page
      .locator("thead th")
      .evaluateAll((cells) =>
        cells.map((th) => [(th.textContent || "").trim(), th.classList.contains("ant-table-column-has-sorters")])
      );
    expect(headers.filter(([title]) => title)).toEqual([
      ["Name", true],
      ["Created By", false],
      ["Created At", true],
      ["Last Executed At", true],
      ["Refresh Schedule", true],
    ]);
  });

  test("sorting by name ignores letter case; the order is kept in the URL and after a reload", async ({ page }) => {
    const all = [...names, otherUsersName];
    const ascending = [...all].sort(byLowerCase);
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(13);

    await sortBy(page, "Name");
    await expect.poll(() => orderOf(page)).toBe("name");
    await expectNames(page, ascending, { ordered: true });
    // "a ... charlie lowercase" is between Bravo and Delta, not after all the upper-case names
    expect(ascending.indexOf(names[2])).toBe(2);

    await sortBy(page, "Name");
    await expect.poll(() => orderOf(page)).toBe("-name");
    await expectNames(page, [...ascending].reverse(), { ordered: true });

    await page.reload();
    expect(orderOf(page)).toBe("-name");
    await expect(page.getByPlaceholder(BOX)).toHaveValue(token);
    await expectNames(page, [...ascending].reverse(), { ordered: true });
  });

  test("sorting by Created At orders the rows by creation time in both directions", async ({ page, api }) => {
    const oldestFirst = (await listed(api))
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
      .map((q) => q.name);
    expect(oldestFirst).toHaveLength(13);
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(13);

    await sortBy(page, "Created At");
    await expect.poll(() => orderOf(page)).toMatch(/^-?created_at$/);
    await expectNames(page, orderOf(page) === "created_at" ? oldestFirst : [...oldestFirst].reverse(), {
      ordered: true,
    });
    const firstOrder = orderOf(page);
    await sortBy(page, "Created At");
    await expect.poll(() => orderOf(page)).toBe(firstOrder === "created_at" ? "-created_at" : "created_at");
    await expectNames(page, orderOf(page) === "created_at" ? oldestFirst : [...oldestFirst].reverse(), {
      ordered: true,
    });
  });

  test("sorting by Last Executed At keeps never-executed queries last in both directions", async ({ page, api }) => {
    const executed = (await listed(api))
      .filter((q) => q.retrieved_at)
      .sort((a, b) => String(a.retrieved_at).localeCompare(String(b.retrieved_at)))
      .map((q) => q.name);
    expect(executed).toEqual(EXECUTED.map((index) => names[index]));
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(13);

    for (const click of [1, 2]) {
      await sortBy(page, "Last Executed At");
      await expect.poll(() => orderOf(page)).toBe(click === 1 ? "executed_at" : "-executed_at");
      const expected = click === 1 ? executed : [...executed].reverse();
      await expect.poll(async () => (await listNames(page)).slice(0, EXECUTED.length)).toEqual(expected);
      expect(await listNames(page)).toHaveLength(13);
    }
  });

  test("sorting by Refresh Schedule orders by interval and keeps unscheduled queries last", async ({ page }) => {
    const scheduled = [names[10], names[3]]; // daily, weekly
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(13);
    await expect(listRows(page).filter({ hasText: names[3] })).toContainText("Every week");
    await expect(listRows(page).filter({ hasText: names[10] })).toContainText("Every day");
    await expect(listRows(page).filter({ hasText: names[0] })).toContainText("Never");

    for (const click of [1, 2]) {
      await sortBy(page, "Refresh Schedule");
      await expect.poll(() => orderOf(page)).toBe(click === 1 ? "schedule" : "-schedule");
      const expected = click === 1 ? scheduled : [...scheduled].reverse();
      await expect.poll(async () => (await listNames(page)).slice(0, 2)).toEqual(expected);
      expect(await listNames(page)).toHaveLength(13);
    }
  });

  test("the page size selector and the pager show every row exactly once", async ({ page }) => {
    const all = [...names, otherUsersName].sort(byLowerCase);
    await page.goto(`/queries?q=${token}&order=name`);
    // 13 rows fit on one page of the default size (20)
    await expectNames(page, all, { ordered: true });
    await expect(page.locator(".ant-pagination-item")).toHaveCount(1);

    await setPageSize(page, 5);
    await expect.poll(() => new URL(page.url()).searchParams.get("page_size")).toBe("5");
    await expectNames(page, all.slice(0, 5), { ordered: true });
    await expect(page.locator(".ant-pagination-item")).toHaveCount(3);

    // Walk the pages with Next: 5 + 5 + 3, nothing twice, nothing missing
    const next = page.locator("li.ant-pagination-next");
    await next.click();
    await expect(page.locator(".ant-pagination-item-active")).toHaveText("2");
    await expectNames(page, all.slice(5, 10), { ordered: true });
    await next.click();
    await expect(page.locator(".ant-pagination-item-active")).toHaveText("3");
    await expectNames(page, all.slice(10), { ordered: true });
    await expect(next).toHaveClass(/ant-pagination-disabled/);

    // Page number buttons and Prev
    await page.locator(".ant-pagination-item-1").click();
    await expectNames(page, all.slice(0, 5), { ordered: true });
    await page.locator(".ant-pagination-item-3").click();
    await expectNames(page, all.slice(10), { ordered: true });
    await page.locator("li.ant-pagination-prev").click();
    await expect(page.locator(".ant-pagination-item-active")).toHaveText("2");
    await expectNames(page, all.slice(5, 10), { ordered: true });

    await setPageSize(page, 10);
    await expect.poll(() => new URL(page.url()).searchParams.get("page_size")).toBe("10");
    await expect(page.locator(".ant-pagination-item")).toHaveCount(2);
    // Still on page 2, which now holds the last three
    await expect(page.locator(".ant-pagination-item-active")).toHaveText("2");
    await expectNames(page, all.slice(10), { ordered: true });

    // The size is kept after a reload
    await page.reload();
    await expect(page.locator(".ant-pagination-item")).toHaveCount(2);
    await page.locator(".ant-pagination-item-1").click();
    await expectNames(page, all.slice(0, 10), { ordered: true });
    await page.locator(".ant-pagination-item-2").click();
    await expectNames(page, all.slice(10), { ordered: true });

    for (const size of [50, 100]) {
      await setPageSize(page, size);
      await expectNames(page, all, { ordered: true });
      await expect(page.locator(".ant-pagination-item")).toHaveCount(1);
    }
  });

  test("All, My Queries, Favorites and Archived each list the right queries", async ({
    page,
    browser,
    guard,
    baseURL,
  }) => {
    await page.goto(`/queries?q=${token}`);
    await expectNames(page, [...names, otherUsersName]);

    // My Queries: without the other user's query
    await page.getByRole("menuitem", { name: "My Queries" }).click();
    await expect(page).toHaveURL(/\/queries\/my/);
    await searchFor(page, BOX, token);
    await expectNames(page, names);

    // Favorites have an extra column with the time they were starred
    await page.getByRole("menuitem", { name: "Favorites" }).click();
    await expect(page).toHaveURL(/\/queries\/favorites/);
    await searchFor(page, BOX, token);
    await expectNames(page, [names[0], names[5]]);
    await expect(page.locator("thead th", { hasText: "Starred At" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Archived" }).click();
    await expect(page).toHaveURL(/\/queries\/archive/);
    await searchFor(page, BOX, token);
    await expectNames(page, [archivedName]);
    await expect(page.locator("thead th", { hasText: "Starred At" })).toHaveCount(0);

    // The other user's My Queries holds only that user's query
    const otherPage = await pageAs(browser, guard, baseURL, otherSession);
    await otherPage.goto(`/queries/my?q=${token}`);
    await expectNames(otherPage, [otherUsersName]);
  });

  test("the star in a row adds the query to the favorites and takes it out again", async ({ page, api }) => {
    const id = ids[8];
    const isFavorite = async () => (await api.get(`/api/queries/${id}`)).is_favorite;
    await page.goto(`/queries?q=${encodeURIComponent(`${token} India`)}`);
    const row = listRows(page);
    await expect(row).toHaveCount(1);
    expect(await isFavorite()).toBe(false);

    await row.getByRole("button", { name: "Add to favorites" }).click();
    await expect(row.getByRole("button", { name: "Remove from favorites" })).toBeVisible();
    await expect.poll(isFavorite).toBe(true);
    await row.getByRole("button", { name: "Remove from favorites" }).click();
    await expect(row.getByRole("button", { name: "Add to favorites" })).toBeVisible();
    await expect.poll(isFavorite).toBe(false);
  });

  test("the tags sidebar filters by one tag, by two with Shift, together with a search, and clears", async ({
    page,
  }) => {
    const tags = page.locator(".tags-list");
    const tag = (name: string) => tags.locator(".ant-menu-item").filter({ hasText: name });
    await page.goto(`/queries?q=${token}`);
    await expect(listRows(page)).toHaveCount(13);

    await tag(tagFinance).click();
    await expect(tag(tagFinance)).toHaveClass(/ant-menu-item-selected/);
    await expectNames(page, names.slice(0, 5));

    await page.keyboard.down("Shift");
    await tag(tagOps).click();
    await page.keyboard.up("Shift");
    await expect(tag(tagOps)).toHaveClass(/ant-menu-item-selected/);
    await expectNames(page, [names[4]]);

    // Without Shift the clicked tag replaces the selection
    await tag(tagOps).click();
    await expect(tag(tagFinance)).not.toHaveClass(/ant-menu-item-selected/);
    await expectNames(page, [names[4], names[5]]);

    await tag(tagFinance).click();
    await searchFor(page, BOX, `${token} Bravo`);
    await expectNames(page, [names[1]]);
    await searchFor(page, BOX, `${token} Foxtrot`);
    await expectNothingFound(page);

    await searchFor(page, BOX, token);
    await tags.getByText("clear selection").click();
    await expect(tags.getByText("clear selection")).toHaveCount(0);
    await expect(tag(tagFinance)).not.toHaveClass(/ant-menu-item-selected/);
    await expect(listRows(page)).toHaveCount(13);
  });
});
