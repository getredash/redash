import type { Locator } from "@playwright/test";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { createQueryViaApi } from "../../support/ui";
import {
  apply,
  dynamicMenuItems,
  expectPending,
  expectRows,
  field,
  openDynamicMenu,
  openSource,
  parameter,
  pickTime,
  pickerPopup,
  rowsOf,
  saveQuery,
  savedParameters,
  shown,
  typeRange,
} from "./helpers";

// Brackets keep the result table from formatting the values as dates
const SQL = `select count(*) as n,
 '[' || coalesce(min(created_at)::date::text, '-') || ' ' || coalesce(max(created_at)::date::text, '-') || ']' as first_last,
 '[{{ r.start }} {{ r.end }}]' as r,
 '[{{ tr.start }} {{ tr.end }}]' as tr,
 '[{{ trs.start }} {{ trs.end }}]' as trs,
 (extract(epoch from ('{{ trs.end }}'::timestamp - '{{ trs.start }}'::timestamp)))::int::text || 's' as trs_length
from orders where created_at >= '{{ r.start }}' and created_at < ('{{ r.end }}'::date + 1)`;

const INITIAL = {
  r: { start: "2026-06-02", end: "2026-06-09" },
  tr: { start: "2026-06-02 08:00", end: "2026-06-09 20:00" },
  trs: { start: "2026-06-02 08:00:00", end: "2026-06-09 20:00:00" },
};

async function createRangesQuery(api: RedashApi, dataSourceId: number) {
  const { id } = await createQueryViaApi(api, {
    name: uniqueName("P date ranges"),
    dataSourceId,
    sql: SQL,
    options: {
      parameters: [
        parameter({ name: "r", type: "date-range", value: INITIAL.r }),
        parameter({ name: "tr", type: "datetime-range", value: INITIAL.tr }),
        parameter({ name: "trs", type: "datetime-range-with-seconds", value: INITIAL.trs }),
      ],
    },
  });
  return id;
}

/** What the database answers for orders between two days, asked without parameters. */
async function ordersBetween(api: RedashApi, dataSourceId: number, start: string, end: string) {
  const [row] = await rowsOf(
    api,
    dataSourceId,
    `select count(*) as n, min(created_at)::date::text as first, max(created_at)::date::text as last
     from orders where created_at >= '${start}' and created_at < ('${end}'::date + 1)`
  );
  return { n: String(row.n), first_last: `[${row.first ?? "-"} ${row.last ?? "-"}]` };
}

/** Presses the "previous month" arrow of the range calendar until its left month is the given one. */
async function showMonth(popup: Locator, header: string) {
  const left = popup.locator(".ant-picker-header-view").first();
  for (let clicks = 0; clicks < 12 && (await left.innerText()).replace(/\s+/g, "") !== header; clicks += 1) {
    const before = await left.innerText();
    await popup.locator(".ant-picker-header-prev-btn").first().click();
    await expect(left).not.toHaveText(before);
  }
  await expect(left).toHaveText(header);
}

/** Wednesday 14 October 2026, 10:30:15 in the browser's time zone (Asia/Jerusalem, UTC+3 on that day). */
const NOW = new Date("2026-10-14T10:30:15+03:00");

test.describe("Date range parameters", () => {
  let queryId: number;
  test.beforeAll(async ({ api, seed }) => {
    queryId = await createRangesQuery(api, seed.dataSources.postgres);
  });

  test("Date Range: two days clicked in the calendar filter the orders to that range", async ({ page, api, seed }) => {
    const expected = await ordersBetween(api, seed.dataSources.postgres, "2026-03-01", "2026-03-15");
    expect(Number(expected.n)).toBeGreaterThan(0);
    const formats = await openSource(page, queryId);
    await expectRows(page, [expect.objectContaining({ r: `[${INITIAL.r.start} ${INITIAL.r.end}]` })]);

    await field(page, "r").first().click();
    const popup = pickerPopup(page);
    await expect(popup.locator(".ant-picker-header-view").first()).toHaveText("Jun2026");
    await showMonth(popup, "Mar2026");
    await popup.locator('td[title="2026-03-01"]').first().click();
    // For the end the calendar jumps back to the month of the current end date
    await expect(field(page, "r").nth(1)).toBeFocused();
    await showMonth(popup, "Mar2026");
    await popup.locator('td[title="2026-03-12"]').first().hover();
    await expect(popup.locator(".ant-picker-cell-in-view.ant-picker-cell-range-hover")).toHaveCount(10);
    await popup.locator('td[title="2026-03-15"]').first().click();
    await expect(popup).toHaveCount(0);
    await expect(field(page, "r").nth(0)).toHaveValue(shown(formats, "2026-03-01"));
    await expect(field(page, "r").nth(1)).toHaveValue(shown(formats, "2026-03-15"));
    await expectPending(page, 1);

    await apply(page);
    await expectRows(page, [
      {
        ...expected,
        r: "[2026-03-01 2026-03-15]",
        tr: `[${INITIAL.tr.start} ${INITIAL.tr.end}]`,
        trs: `[${INITIAL.trs.start} ${INITIAL.trs.end}]`,
        trs_length: "648000s",
      },
    ]);
    // The first and the last order found are inside the range
    const [first, last] = expected.first_last.slice(1, -1).split(" ");
    expect(first >= "2026-03-01" && last <= "2026-03-15").toBe(true);
  });

  test("Date and Time Range: both ends typed, with Enter after each, reach the database with their times", async ({
    page,
  }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [expect.objectContaining({ r: `[${INITIAL.r.start} ${INITIAL.r.end}]` })]);
    await typeRange(page, "tr", shown(formats, "2026-03-02 09:15"), shown(formats, "2026-03-03 18:45"));
    await expect(field(page, "tr").nth(0)).toHaveValue(shown(formats, "2026-03-02 09:15"));
    await expect(field(page, "tr").nth(1)).toHaveValue(shown(formats, "2026-03-03 18:45"));
    await apply(page);
    await expectRows(page, [expect.objectContaining({ tr: "[2026-03-02 09:15 2026-03-03 18:45]" })]);
  });

  test("Date and Time Range (with seconds): both ends picked with calendar, time columns and OK", async ({ page }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [expect.objectContaining({ r: `[${INITIAL.r.start} ${INITIAL.r.end}]` })]);
    await field(page, "trs").first().click();
    const popup = pickerPopup(page);
    await expect(popup.locator(".ant-picker-time-panel-column")).toHaveCount(3);

    await popup.locator('td[title="2026-06-12"]').first().click();
    await pickTime(page, 0, "01");
    await pickTime(page, 1, "02");
    await pickTime(page, 2, "03");
    await popup.locator(".ant-picker-ok button").click();
    // OK on the start moves on to the end
    await expect(field(page, "trs").nth(1)).toBeFocused();
    await popup.locator('td[title="2026-06-13"]').first().click();
    await pickTime(page, 0, "01");
    await pickTime(page, 1, "02");
    await pickTime(page, 2, "13");
    await popup.locator(".ant-picker-ok button").click();
    await expect(popup).toHaveCount(0);
    await expect(field(page, "trs").nth(0)).toHaveValue(shown(formats, "2026-06-12 01:02:03"));
    await expect(field(page, "trs").nth(1)).toHaveValue(shown(formats, "2026-06-13 01:02:13"));

    await apply(page);
    // One day and ten seconds, computed by the database
    await expectRows(page, [
      expect.objectContaining({ trs: "[2026-06-12 01:02:03 2026-06-13 01:02:13]", trs_length: "86410s" }),
    ]);
  });

  test("the range calendar shows two months inside the window, the current range and a preview while hovering", async ({
    page,
  }) => {
    await openSource(page, queryId);
    await field(page, "r").first().click();
    const popup = pickerPopup(page);
    await expect(popup.locator(".ant-picker-date-panel")).toHaveCount(2);
    await expect(popup.locator(".ant-picker-header-view")).toHaveText(["Jun2026", "Jul2026"]);

    const viewport = page.viewportSize();
    const fieldBox = await field(page, "r").first().boundingBox();
    if (!viewport || !fieldBox) {
      throw new Error("the range field is not visible");
    }
    await expect(async () => {
      const box = await popup.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(500);
        expect(box.width).toBeLessThan(640);
        expect(box.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }).toPass();

    // The saved range 2-9 June: both ends marked and the six days between highlighted
    await expect(popup.locator(".ant-picker-cell-in-view.ant-picker-cell-range-start")).toHaveAttribute(
      "title",
      "2026-06-02"
    );
    await expect(popup.locator(".ant-picker-cell-in-view.ant-picker-cell-range-end")).toHaveAttribute(
      "title",
      "2026-06-09"
    );
    await expect(popup.locator(".ant-picker-cell-in-view.ant-picker-cell-in-range")).toHaveCount(6);

    // After the first click, the days up to the mouse are previewed as the new range
    await popup.locator('td[title="2026-07-06"]').first().click();
    await popup.locator('td[title="2026-07-10"]').first().hover();
    await expect
      .poll(() =>
        popup
          .locator(".ant-picker-cell-in-view.ant-picker-cell-range-hover")
          .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("title")))
      )
      .toEqual(["2026-07-07", "2026-07-08", "2026-07-09"]);
  });

  test("Date Range: typing the start, Tab, the end and Enter keeps both dates", async ({ page }) => {
    knownIssue("date-range-tab-loses-input");
    const formats = await openSource(page, queryId);
    await field(page, "r").first().click();
    await expect(pickerPopup(page)).toBeVisible();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(shown(formats, "2026-01-01"), { delay: 20 });
    await page.keyboard.press("Tab");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(shown(formats, "2026-01-31"), { delay: 20 });
    await page.keyboard.press("Enter");
    await page
      .locator(".query-results-wrapper, .query-fixed-layout")
      .first()
      .click({ position: { x: 600, y: 300 } });
    await expect(pickerPopup(page)).toHaveCount(0);
    await expect(field(page, "r").nth(0)).toHaveValue(shown(formats, "2026-01-01"), { timeout: 3000 });
    await expect(field(page, "r").nth(1)).toHaveValue(shown(formats, "2026-01-31"), { timeout: 3000 });
  });
});

test.describe("Dynamic date range values", () => {
  test("the menu lists the 15 ranges with what they mean today", async ({ page, api, seed }) => {
    const id = await createRangesQuery(api, seed.dataSources.postgres);
    await page.clock.setFixedTime(NOW);
    await openSource(page, id);

    const menu = await openDynamicMenu(page, "r");
    expect(await dynamicMenuItems(menu)).toEqual([
      "This week Oct 11 - Oct 17",
      "This month October",
      "This year 2026",
      "Last week Oct 4 - Oct 10",
      "Last month September",
      "Last year 2025",
      "Last 7 days Oct 7 - Today",
      "Last 14 days Sep 30 - Today",
      "Last 30 days Sep 14 - Today",
      "Last 60 days Aug 15 - Today",
      "Last 90 days Jul 16 - Today",
      "Last 12 months",
      "Last 2 years",
      "Last 3 years",
      "Last 10 years",
    ]);
    await page.keyboard.press("Escape");

    // Ranges with a time also offer single days
    const timeMenu = await openDynamicMenu(page, "trs");
    expect((await dynamicMenuItems(timeMenu)).slice(0, 3)).toEqual([
      "Today Oct 14",
      "Yesterday Oct 13",
      "This week Oct 11 - Oct 17",
    ]);
    await expect(timeMenu.locator("li.ant-dropdown-menu-item")).toHaveCount(17);
  });

  test("a dynamic range is evaluated when the query runs, saved by name and evaluated again later", async ({
    page,
    api,
    seed,
  }) => {
    test.setTimeout(180_000);
    const id = await createRangesQuery(api, seed.dataSources.postgres);
    await page.clock.setFixedTime(NOW);
    const formats = await openSource(page, id);
    await expectRows(page, [expect.objectContaining({ r: `[${INITIAL.r.start} ${INITIAL.r.end}]` })]);

    const pickDynamic = async (name: string, label: string) => {
      const menu = await openDynamicMenu(page, name);
      await menu
        .locator("li")
        .filter({ hasText: new RegExp(`^${label}`) })
        .first()
        .click();
      await expect(field(page, name).first()).toHaveAttribute("placeholder", label);
      await expect(field(page, name).first()).toHaveValue("");
    };

    for (const [label, start, end, urlValue] of [
      ["Last month", "2026-09-01", "2026-09-30", "d_last_month"],
      ["This week", "2026-10-11", "2026-10-17", "d_this_week"],
      ["Last 7 days", "2026-10-07", "2026-10-14", "d_last_7_days"],
      ["This year", "2026-01-01", "2026-12-31", "d_this_year"],
      ["Last 12 months", "2025-10-14", "2026-10-14", "d_last_12_months"],
    ]) {
      await pickDynamic("r", label);
      await apply(page);
      const expected = await ordersBetween(api, seed.dataSources.postgres, start, end);
      await expectRows(page, [expect.objectContaining({ ...expected, r: `[${start} ${end}]` })], label);
      await expect(page).toHaveURL(new RegExp(`[?&]p_r=${urlValue}(&|$)`));
    }

    await pickDynamic("trs", "Last week");
    await apply(page);
    // Whole days, to the second: Sunday 00:00:00 to Saturday 23:59:59
    await expectRows(page, [
      expect.objectContaining({ trs: "[2026-10-04 00:00:00 2026-10-10 23:59:59]", trs_length: "604799s" }),
    ]);

    await saveQuery(page);
    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.value]))
      .toEqual([
        ["r", "d_last_12_months"],
        ["tr", INITIAL.tr],
        ["trs", "d_last_week"],
      ]);

    // A week later the saved names stand for other dates
    await page.clock.setFixedTime(new Date(NOW.getTime() + 7 * 24 * 3600 * 1000));
    await openSource(page, id);
    await expect(field(page, "r").first()).toHaveAttribute("placeholder", "Last 12 months");
    await expect(field(page, "trs").first()).toHaveAttribute("placeholder", "Last week");
    await expectRows(page, [
      expect.objectContaining({
        r: "[2025-10-21 2026-10-21]",
        trs: "[2026-10-11 00:00:00 2026-10-17 23:59:59]",
      }),
    ]);

    // "Back to Static Value" fills in the dates the name stands for now
    const menu = await openDynamicMenu(page, "r");
    await menu.locator("li").filter({ hasText: "Back to Static Value" }).click();
    await expect(field(page, "r").nth(0)).toHaveValue(shown(formats, "2025-10-21"));
    await expect(field(page, "r").nth(1)).toHaveValue(shown(formats, "2026-10-21"));
    await expectPending(page, 1);
    await apply(page);
    await expect(page).toHaveURL(/[?&]p_r=2025-10-21--2026-10-21(&|$)/);
  });
});
