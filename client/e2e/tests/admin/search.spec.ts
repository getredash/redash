import { expect, test } from "../../support/fixtures";
import { createQueryViaApi } from "../../support/ui";
import {
  createDashboardViaApi,
  expectNames,
  expectNothingFound,
  listNames,
  listRows,
  searchFor,
  uniqueToken,
} from "./helpers";

const QUERIES_BOX = "Search Queries...";
const DASHBOARDS_BOX = "Search Dashboards...";

/**
 * Every search here contains a token that only this run's objects have in their names, so the results do not
 * depend on what else is on the instance.
 */
test.describe("Search in the queries list", () => {
  const token = uniqueToken("asrch");
  const name = {
    channel: `A ${token} revenue by channel`,
    month: `A ${token} revenue by month`,
    reverse: `A ${token} reverse lookup`,
    churn: `A ${token} customer churn`,
    funnel: `A ${token} marketing funnel`,
    special: `A ${token} O'Brien "quoted" profit & loss (P&L) 100%`,
    accents: `A ${token} café Zürich name-value Q-10`,
    cjk: `A ${token} 日本語 クエリ`,
    archived: `A ${token} archived revenue`,
  };
  const ids: Record<string, number> = {};

  test.beforeAll(async ({ api, seed }) => {
    const descriptions: Record<string, string> = { churn: "counts the quokka population" };
    const sql: Record<string, string> = { funnel: "select 1 as zebrafishmarker" };
    for (const [key, queryName] of Object.entries(name)) {
      const query = await createQueryViaApi(api, {
        name: queryName,
        dataSourceId: seed.dataSources.postgres,
        sql: sql[key] || "select 1 as a",
        description: descriptions[key],
        run: false,
      });
      ids[key] = query.id;
    }
    await api.post(`/api/queries/${ids.channel}/favorite`);
    await api.delete(`/api/queries/${ids.archived}`);
  });

  test.afterAll(async ({ api }) => {
    for (const id of Object.values(ids)) {
      await api.delete(`/api/queries/${id}`).catch(() => undefined);
    }
  });

  test("a word matches as a whole word or as a prefix, in any letter case", async ({ page }) => {
    await page.goto("/queries");
    await searchFor(page, QUERIES_BOX, `${token} revenue`);
    await expectNames(page, [name.channel, name.month]);
    await searchFor(page, QUERIES_BOX, `${token} rev`);
    await expectNames(page, [name.channel, name.month, name.reverse]);
    await searchFor(page, QUERIES_BOX, `${token.toUpperCase()} REVENUE`);
    await expectNames(page, [name.channel, name.month]);
  });

  test("every word must match, in any order", async ({ page }) => {
    await page.goto("/queries");
    await searchFor(page, QUERIES_BOX, `${token} revenue channel`);
    await expectNames(page, [name.channel]);
    await searchFor(page, QUERIES_BOX, `channel ${token} revenue`);
    await expectNames(page, [name.channel]);
    await searchFor(page, QUERIES_BOX, `${token} rev chan`);
    await expectNames(page, [name.channel]);
  });

  test("the description, the query text and the id are searched too", async ({ page }) => {
    await page.goto("/queries");
    await searchFor(page, QUERIES_BOX, `${token} quokka`);
    await expectNames(page, [name.churn]);
    await searchFor(page, QUERIES_BOX, `${token} zebrafishmarker`);
    await expectNames(page, [name.funnel]);
    await searchFor(page, QUERIES_BOX, String(ids.churn));
    await expect(listRows(page).locator(`a[href="queries/${ids.churn}"]`)).toBeVisible();
  });

  test("a search without matches shows the empty state", async ({ page }) => {
    await page.goto("/queries");
    await searchFor(page, QUERIES_BOX, `${token} xyzzyplughnothing`);
    await expectNothingFound(page);
  });

  test("names with quotes, symbols, accents and CJK text are found", async ({ page }) => {
    await page.goto("/queries");
    const cases: [string, string][] = [
      ["O'Brien", name.special],
      ['"quoted"', name.special],
      ["profit & loss", name.special],
      ["(P&L)", name.special],
      ["100%", name.special],
      ["café", name.accents],
      ["Zürich", name.accents],
      ["name-value", name.accents],
      ["Q-10", name.accents],
      ["日本語", name.cjk],
    ];
    for (const [term, expected] of cases) {
      await searchFor(page, QUERIES_BOX, `${token} ${term}`);
      await expectNames(page, [expected]);
    }
  });

  test("search operators and stray punctuation never break the list", async ({ page }) => {
    await page.goto("/queries");
    // "-word" excludes, a quoted phrase must match as a phrase
    await searchFor(page, QUERIES_BOX, `${token} revenue -month`);
    await expectNames(page, [name.channel]);
    await searchFor(page, QUERIES_BOX, `${token} "revenue by"`);
    await expectNames(page, [name.channel, name.month]);
    await searchFor(page, QUERIES_BOX, `${token} "by revenue"`);
    await expectNothingFound(page);

    // These are answered (with rows or with the empty state) rather than with an error; the guard fails the
    // test on any HTTP 5xx
    for (const term of ["rev:*", "margin:", "a | !b", "'", '"', "\\", "%", "(", ")"]) {
      await searchFor(page, QUERIES_BOX, `${token} ${term}`);
      const answered = page.waitForResponse((r) => r.url().includes("/api/queries?") && r.status() < 500);
      await page.reload();
      expect((await answered).status(), `search for ${term}`).toBe(200);
      await expect(
        listRows(page)
          .first()
          .or(page.getByText(/Sorry, we couldn.t find anything/))
      ).toBeVisible();
      for (const shown of await listNames(page)) {
        expect(shown).toContain(token);
      }
    }
  });

  test("the term is kept in the URL without adding history entries, and survives a reload", async ({ page }) => {
    await page.goto("/queries");
    const historyLength = await page.evaluate(() => window.history.length);
    await searchFor(page, QUERIES_BOX, `${token} quokka`);
    await expectNames(page, [name.churn]);
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
    await page.reload();
    await expect(page.getByPlaceholder(QUERIES_BOX)).toHaveValue(`${token} quokka`);
    await expectNames(page, [name.churn]);
  });

  test("My Queries, Favorites and Archived are searched within their own lists", async ({ page }) => {
    await page.goto("/queries/my");
    await searchFor(page, QUERIES_BOX, `${token} rev`);
    await expectNames(page, [name.channel, name.month, name.reverse]);
    await expect(page).toHaveURL(/\/queries\/my\?/);

    await page.goto("/queries/favorites");
    await searchFor(page, QUERIES_BOX, `${token} rev`);
    await expectNames(page, [name.channel]);

    await page.goto("/queries/archive");
    await searchFor(page, QUERIES_BOX, `${token} rev`);
    await expectNames(page, [name.archived]);

    // The archived query is not in the list of all queries
    await page.goto("/queries");
    await searchFor(page, QUERIES_BOX, `${token} archived`);
    await expectNothingFound(page);
  });

  // Used to lose a character about one time in seven: the search is debounced and waits for the previous one, so
  // SearchInput (items-list/components/Sidebar.jsx) got the cleared term back after typing had continued, and
  // copied it over the new keystrokes ("orders" became "rders")
  test("typing while the previous search is still running keeps every typed character", async ({ page }) => {
    await page.goto("/queries");
    const box = page.getByPlaceholder(QUERIES_BOX);
    await searchFor(page, QUERIES_BOX, "select");
    await box.press("ControlOrMeta+A");
    await box.press("Delete");
    await page.waitForTimeout(200); // the pause is the gesture: continue typing as the previous search completes
    await page.keyboard.type("orders");
    await expect(box).toHaveValue("orders");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("orders");
  });
});

test.describe("Search in the dashboards list", () => {
  const token = uniqueToken("asrchd");
  const name = {
    revenue: `A ${token} dash revenue overview`,
    funnel: `A ${token} dash marketing funnel`,
    zeta: `A ${token} dash zeta`,
  };
  const ids: number[] = [];

  test.beforeAll(async ({ api }) => {
    for (const dashboardName of Object.values(name)) {
      ids.push((await createDashboardViaApi(api, dashboardName, [])).id);
    }
  });
  test.afterAll(async ({ api }) => {
    for (const id of ids) {
      await api.delete(`/api/dashboards/${id}`).catch(() => undefined);
    }
  });

  test("the term matches anywhere in the name, in any letter case, as one piece of text", async ({ page }) => {
    await page.goto("/dashboards");
    await searchFor(page, DASHBOARDS_BOX, token);
    await expectNames(page, Object.values(name));
    await searchFor(page, DASHBOARDS_BOX, `${token} dash rev`);
    await expectNames(page, [name.revenue]);
    await searchFor(page, DASHBOARDS_BOX, `${token.toUpperCase()} DASH REV`);
    await expectNames(page, [name.revenue]);
    await searchFor(page, DASHBOARDS_BOX, `${token} dash marketing funnel`);
    await expectNames(page, [name.funnel]);
    await searchFor(page, DASHBOARDS_BOX, `${token.slice(3)} dash z`);
    await expectNames(page, [name.zeta]);

    // Unlike the queries search, the words are not matched separately
    await searchFor(page, DASHBOARDS_BOX, `${token} funnel marketing`);
    await expectNothingFound(page);
    await searchFor(page, DASHBOARDS_BOX, `${token} zzznothing`);
    await expectNothingFound(page);
  });

  test("% and _ in the term act as wildcards, quotes are harmless", async ({ page }) => {
    await page.goto("/dashboards");
    await searchFor(page, DASHBOARDS_BOX, `${token}_dash%funnel`);
    await expectNames(page, [name.funnel]);
    await searchFor(page, DASHBOARDS_BOX, `${token}%`);
    await expectNames(page, Object.values(name));
    for (const term of [`${token} O'`, `${token} "`]) {
      await searchFor(page, DASHBOARDS_BOX, term);
      await expectNothingFound(page);
    }
  });
});
