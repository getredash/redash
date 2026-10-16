import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, centerOf } from "../../support/ui";
import {
  choose,
  columnOrder,
  columnPanel,
  dragTo,
  editor,
  editorTab,
  hoverAt,
  newVisualization,
  openSourcePage,
  openViewPage,
  optionTexts,
  overtype,
  preview,
  type Row,
  resultRows,
  savedVisualization,
  saveVisualization,
  seedQuery,
  toggleColumn,
  tooltip,
  typeIn,
  typeInto,
  SLOW_INSTANCE_TIMEOUT,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// Weekly signup cohorts: 8 cohorts, 8 weeks of activity each
const COHORT_SQL = `with u as (select user_id, min(signup_date) as cohort from events group by 1),
tot as (select cohort, count(*) as total from u group by 1)
select u.cohort as cohort_date, ((e.event_date - u.cohort) / 7)::int + 1 as week_no, tot.total as cohort_size,
  count(distinct e.user_id) as active
from events e join u using (user_id) join tot using (cohort)
group by 1, 2, 3 order by 1, 2`;

const DETAILS_SQL = `select o.id, o.created_at, c.name as city, o.category, o.amount, o.note, (o.quantity > 2) as big
from orders o join cities c on c.id = o.city_id order by o.id limit 25`;

const cohort = (scope: Page | Locator) => scope.locator(".cornelius-container").first();

/** The body rows of the cohort table, each as its cell texts joined with spaces. */
function cohortRows(scope: Page | Locator): Promise<string[]> {
  return cohort(scope)
    .locator("tr")
    .evaluateAll((trs) =>
      trs
        .filter((tr) => tr.querySelector("td"))
        .map((tr) =>
          Array.from(tr.children)
            .map((td) => (td.textContent || "").trim())
            .join(" ")
        )
    );
}

const cohortHead = (scope: Page | Locator) => cohort(scope).locator("th");

/** How many different background colours the value cells have. */
function cohortColors(scope: Page | Locator): Promise<number> {
  return cohort(scope)
    .locator("td.cornelius-percentage, td.cornelius-absolute")
    .evaluateAll((cells) => new Set(cells.map((cell) => (cell as HTMLElement).style.backgroundColor)).size);
}

const WEEKLY_DIAGONAL = [
  "Week of Jan 5, 2026 28 100.00% 64.29% 57.14% 78.57% 57.14% 46.43% 53.57% 42.86%",
  "Week of Jan 12, 2026 32 100.00% 68.75% 62.50% 56.25% 46.88% 31.25% 50.00% -",
  "Week of Jan 19, 2026 30 100.00% 83.33% 80.00% 46.67% 63.33% 46.67% - -",
  "Week of Jan 26, 2026 29 100.00% 68.97% 55.17% 62.07% 58.62% - - -",
  "Week of Feb 2, 2026 31 100.00% 77.42% 67.74% 48.39% - - - -",
  "Week of Feb 9, 2026 33 100.00% 75.76% 63.64% - - - - -",
  "Week of Feb 16, 2026 26 100.00% 84.62% - - - - - -",
  "Week of Feb 23, 2026 31 100.00% - - - - - - -",
];
const STAGES = ["1", "2", "3", "4", "5", "6", "7", "8"];

/** The fields of the details view as [label, value] pairs. */
function detailsFields(scope: Page | Locator): Promise<string[][]> {
  return scope
    .locator(".details-viz")
    .first()
    .locator("tr")
    .evaluateAll((trs) =>
      trs.map((tr) => [
        (tr.querySelector(".ant-descriptions-item-label")?.textContent || "").trim(),
        (tr.querySelector(".ant-descriptions-item-content")?.textContent || "").trim(),
      ])
    );
}

test.describe("Cohort visualization", () => {
  test("the editor maps the columns and sets interval, mode, colours and titles", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V cohort"), COHORT_SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "COHORT", "Cohort A");
    const pv = preview(page);

    await choose(page, "Cohort.DateColumn", "Cohort.DateColumn.cohort_date");
    await choose(page, "Cohort.StageColumn", "Cohort.StageColumn.week_no");
    await choose(page, "Cohort.TotalColumn", "Cohort.TotalColumn.cohort_size");
    await choose(page, "Cohort.ValueColumn", "Cohort.ValueColumn.active");
    // The default interval is daily: one row per day, most of them empty
    await expect.poll(async () => (await cohortRows(pv)).length).toBe(50);
    expect((await cohortRows(pv))[0]).toMatch(/^January 5, 2026 28 100\.00% 64\.29% /);
    expect((await cohortRows(pv))[1]).toMatch(/^January 6, 2026 0 - - /);

    await editorTab(page, "Options");
    expect(await optionTexts(page, "Cohort.TimeInterval")).toEqual(["Daily", "Weekly", "Monthly"]);
    await choose(page, "Cohort.TimeInterval", "Cohort.TimeInterval.weekly");
    await expect(cohortHead(pv)).toHaveText(["Time", "Users", ...STAGES]);
    // "Fill gaps with zeros" (the default mode): each later cohort has one week less
    await expect.poll(() => cohortRows(pv)).toEqual(WEEKLY_DIAGONAL);

    expect(await optionTexts(page, "Cohort.Mode")).toEqual(["Fill gaps with zeros", "Show data as is"]);
    await choose(page, "Cohort.Mode", "Cohort.Mode.simple");
    // "Show data as is": the full rectangle
    await expect
      .poll(async () => (await cohortRows(pv)).map((row) => row.split(" ").filter((cell) => cell === "-").length))
      .toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect((await cohortRows(pv))[7]).toBe(
      "Week of Feb 23, 2026 31 100.00% 77.42% 74.19% 70.97% 58.06% 29.03% 48.39% 41.94%"
    );

    await choose(page, "Cohort.TimeInterval", "Cohort.TimeInterval.monthly");
    await expect
      .poll(async () => (await cohortRows(pv)).map((row) => row.split(" 2026 ")[0]))
      .toEqual(["January", "February", "March", "April", "May", "June", "July", "August"]);
    await choose(page, "Cohort.TimeInterval", "Cohort.TimeInterval.daily");
    await expect.poll(async () => (await cohortRows(pv)).length).toBe(50);
    await choose(page, "Cohort.TimeInterval", "Cohort.TimeInterval.weekly");
    await choose(page, "Cohort.Mode", "Cohort.Mode.diagonal");
    await expect.poll(() => cohortRows(pv)).toEqual(WEEKLY_DIAGONAL);

    await editorTab(page, "Colors");
    const before = await cohortColors(pv);
    await overtype(editor(page).getByLabel("Steps"), "4");
    await expect(editor(page).getByLabel("Steps")).toHaveValue("4");
    await expect.poll(() => cohortColors(pv)).toBe(3);
    expect(before).toBeGreaterThan(3);

    await editorTab(page, "Appearance");
    await typeInto(editor(page).getByLabel("Time Column Title"), "Signup week");
    await expect(cohortHead(pv).first()).toHaveText("Signup week");
    await typeInto(editor(page).getByLabel("People Column Title"), "New users");
    await expect(cohortHead(pv)).toHaveText(["Signup week", "New users", ...STAGES]);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      mode: "diagonal",
      timeInterval: "weekly",
      dateColumn: "cohort_date",
      stageColumn: "week_no",
      totalColumn: "cohort_size",
      valueColumn: "active",
      colors: { steps: 4 },
      timeColumnTitle: "Signup week",
      peopleColumnTitle: "New users",
    });

    await openViewPage(page, queryId, saved.id);
    await expect(cohortHead(page)).toHaveText(["Signup week", "New users", ...STAGES]);
    await expect.poll(() => cohortRows(page)).toEqual(WEEKLY_DIAGONAL);
    await expect.poll(() => cohortColors(page)).toBe(3);

    // Hovering a percentage shows the absolute number
    const cells = cohort(page).locator("td.cornelius-percentage");
    await expect(cells).toHaveCount(36);
    await expect(cells.nth(1)).toHaveText("64.29%");
    await hoverAt(page, await centerOf(cells.nth(1)));
    await expect(tooltip(page).filter({ hasText: /^18$/ })).toBeVisible();
    await expect(cells.nth(9)).toHaveText("68.75%");
    await hoverAt(page, await centerOf(cells.nth(9)));
    await expect(tooltip(page).filter({ hasText: /^22$/ })).toBeVisible();
  });
});

test.describe("Details view", () => {
  let queryId: number;
  let rows: Row[];

  test.beforeEach(async ({ api, seed }) => {
    queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V details"), DETAILS_SQL);
    rows = await resultRows(api, queryId);
    expect(rows).toHaveLength(25);
  });

  test("the editor hides, reorders, renames and formats the fields", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "DETAILS", "Details A");
    const pv = preview(page);
    const labels = async (scope: Page | Locator) => (await detailsFields(scope)).map(([name]) => name);
    const valueOf = async (scope: Page | Locator, name: string) =>
      (await detailsFields(scope)).find(([field]) => field === name)?.[1];
    await expect.poll(() => labels(pv)).toEqual(["id", "created_at", "city", "category", "amount", "note", "big"]);
    expect(await valueOf(pv, "city")).toBe("Tel Aviv");
    expect(await valueOf(pv, "amount")).toBe("229.54");
    expect(await valueOf(pv, "big")).toBe("true");

    await byTest(page, "Details.Column.big.Visibility").click();
    await expect.poll(() => labels(pv)).toEqual(["id", "created_at", "city", "category", "amount", "note"]);

    const handle = (column: string) => columnPanel(page, "Details", column).locator(".drag-handle");
    const top = await centerOf(handle("id"));
    await dragTo(page, await centerOf(handle("amount")), { x: top.x, y: top.y - 8 }, { steps: 30 });
    await expect
      .poll(() => columnOrder(page, "Details"))
      .toEqual(["amount", "id", "created_at", "city", "category", "note", "big"]);
    await expect.poll(() => labels(pv)).toEqual(["amount", "id", "created_at", "city", "category", "note"]);

    await toggleColumn(page, "Details", "city");
    await typeIn(page, "Details.Column.city.Title", "Ship-to city");
    await expect.poll(() => labels(pv)).toContain("Ship-to city");
    await typeIn(page, "Details.Column.city.Description", "Where it went");
    await expect(pv.locator(".details-viz .fa-info-circle")).toHaveCount(1);
    await columnPanel(page, "Details", "city")
      .locator(".ant-radio-button-wrapper")
      .filter({ has: byTest(page, "TextAlignmentSelect.Right") })
      .click();
    const cityValue = pv
      .locator(".details-viz tr")
      .filter({ hasText: "Ship-to city" })
      .locator(".ant-descriptions-item-content div")
      .first();
    await expect(cityValue).toHaveCSS("text-align", "right");
    await toggleColumn(page, "Details", "city");

    // Allow HTML: escaped before, bold after
    const noteValue = pv
      .locator(".details-viz tr")
      .filter({ hasText: /^note/ })
      .locator(".ant-descriptions-item-content");
    await expect(noteValue).toHaveText("gift <b>wrap</b>");
    await expect(noteValue.locator("b")).toHaveCount(0);
    expect(await noteValue.innerHTML()).toContain("gift &lt;b&gt;wrap&lt;/b&gt;");
    await toggleColumn(page, "Details", "note");
    await columnPanel(page, "Details", "note").locator('[data-test="Table.ColumnEditor.Text.AllowHTML"]').click();
    await expect(noteValue.locator("b")).toHaveText("wrap");
    await expect(noteValue).toHaveText("gift wrap");

    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    const summary = [...stored.options.columns]
      .sort((a, b) => a.order - b.order)
      .map((c) => [c.name, c.title, c.visible, c.alignContent, c.allowHTML, c.description].join("/"));
    expect(summary).toEqual([
      "amount/amount/true/left/false/",
      "id/id/true/left/false/",
      "created_at/created_at/true/left/false/",
      "city/Ship-to city/true/right/false/Where it went",
      "category/category/true/left/false/",
      "note/note/true/left/true/",
      "big/big/false/left/false/",
    ]);

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => labels(page)).toEqual(["amount", "id", "created_at", "Ship-to city", "category", "note"]);
    expect(await valueOf(page, "note")).toBe("gift wrap");
    await expect(page.locator(".details-viz tr").filter({ hasText: /^note/ }).locator("b")).toHaveText("wrap");

    // The description is the tooltip of the info icon beside the field name
    await hoverAt(page, await centerOf(page.locator(".details-viz .fa-info-circle")));
    await expect(tooltip(page)).toHaveText("Where it went");
  });

  test("the paginator steps through the rows", async ({ page, api }) => {
    // The details view with default options
    const { createVisualizationViaApi } = await import("../../support/ui");
    const id = await createVisualizationViaApi(api, queryId, { type: "DETAILS", name: "Details", options: {} });
    await openViewPage(page, queryId, id);
    const pager = page.locator(".details-viz .ant-pagination");
    const active = pager.locator(".ant-pagination-item-active");
    const shown = async () => {
      const fields = Object.fromEntries(await detailsFields(page));
      return [fields.id, fields.city, fields.amount];
    };
    const expected = (number: number) => {
      const row = rows[number - 1];
      return [String(row.id), String(row.city), Number(row.amount).toFixed(2)];
    };

    await expect(active).toHaveText("1");
    await expect.poll(shown).toEqual(["1", "Tel Aviv", "229.54"]);

    await pager.locator(".ant-pagination-next").click();
    await expect(active).toHaveText("2");
    await expect.poll(shown).toEqual(expected(2));

    await pager.locator(".ant-pagination-item-5").click();
    await expect(active).toHaveText("5");
    await expect.poll(shown).toEqual(expected(5));

    await pager.locator(".ant-pagination-item").last().click();
    await expect(active).toHaveText("25");
    await expect.poll(shown).toEqual(expected(25));

    await pager.locator(".ant-pagination-prev").click();
    await expect(active).toHaveText("24");
    await expect.poll(shown).toEqual(expected(24));
  });
});
