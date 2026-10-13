import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
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
  saveQuery,
  savedParameters,
  shown,
  typeDate,
  valueInput,
} from "./helpers";

// The values are wrapped in brackets so that the result table shows them as the database got them instead of
// formatting them as dates
const SQL = `select '[{{ d }}]' as d, to_char('{{ d }}'::date, 'FMDay') as dow,
 '[{{ dt }}]' as dt, '[' || ('{{ dt }}'::timestamp + interval '1 hour')::text || ']' as dt_plus_1h,
 '[{{ dts }}]' as dts, '[' || ('{{ dts }}'::timestamp + interval '1 second')::text || ']' as dts_plus_1s`;

const INITIAL = { d: "2026-01-10", dt: "2026-01-10 08:00", dts: "2026-01-10 08:00:00" };
const INITIAL_ROW = {
  d: "[2026-01-10]",
  dow: "Saturday",
  dt: "[2026-01-10 08:00]",
  dt_plus_1h: "[2026-01-10 09:00:00]",
  dts: "[2026-01-10 08:00:00]",
  dts_plus_1s: "[2026-01-10 08:00:01]",
};

async function createDatesQuery(api: RedashApi, dataSourceId: number) {
  const { id } = await createQueryViaApi(api, {
    name: uniqueName("P dates"),
    dataSourceId,
    sql: SQL,
    options: {
      parameters: [
        parameter({ name: "d", type: "date", value: INITIAL.d }),
        parameter({ name: "dt", type: "datetime-local", value: INITIAL.dt }),
        parameter({ name: "dts", type: "datetime-with-seconds", value: INITIAL.dts }),
      ],
    },
  });
  return id;
}

/** Wednesday 14 October 2026, 10:30:15 in the browser's time zone (Asia/Jerusalem, UTC+3 on that day). */
const NOW = new Date("2026-10-14T10:30:15+03:00");

test.describe("Date parameters", () => {
  let queryId: number;
  test.beforeAll(async ({ api, seed }) => {
    queryId = await createDatesQuery(api, seed.dataSources.postgres);
  });

  test("Date: a day picked in the calendar reaches the database as YYYY-MM-DD", async ({ page }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);

    await field(page, "d").click();
    const popup = pickerPopup(page);
    await popup.locator(".ant-picker-month-btn").click();
    await popup.locator(".ant-picker-cell").filter({ hasText: "Mar" }).click();
    await popup.locator('td[title="2026-03-15"]').click();
    await expect(popup).toHaveCount(0);
    await expect(field(page, "d")).toHaveValue(shown(formats, "2026-03-15"));
    await expectPending(page, 1);

    await apply(page);
    await expectRows(page, [{ ...INITIAL_ROW, d: "[2026-03-15]", dow: "Sunday" }]);
  });

  test("Date and Time: day and time picked with the mouse reach the database as YYYY-MM-DD HH:mm", async ({ page }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    await field(page, "dt").click();
    const popup = pickerPopup(page);
    await expect(popup.locator(".ant-picker-time-panel-column")).toHaveCount(2);
    await popup.locator(".ant-picker-month-btn").click();
    await popup.locator(".ant-picker-cell").filter({ hasText: "Mar" }).click();
    await popup.locator('td[title="2026-03-20"]').click();
    await pickTime(page, 0, "14");
    await pickTime(page, 1, "30");
    await popup.locator(".ant-picker-ok button").click();
    await expect(popup).toHaveCount(0);
    await expect(field(page, "dt")).toHaveValue(shown(formats, "2026-03-20 14:30"));

    await apply(page);
    await expectRows(page, [{ ...INITIAL_ROW, dt: "[2026-03-20 14:30]", dt_plus_1h: "[2026-03-20 15:30:00]" }]);
  });

  test("Date and Time (with seconds): a typed value reaches the database with its seconds", async ({ page }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    await typeDate(page, "dts", shown(formats, "2026-04-20 08:09:10"));
    await expect(field(page, "dts")).toHaveValue(shown(formats, "2026-04-20 08:09:10"));

    await apply(page);
    await expectRows(page, [{ ...INITIAL_ROW, dts: "[2026-04-20 08:09:10]", dts_plus_1s: "[2026-04-20 08:09:11]" }]);
  });

  test("the calendar opens under the field inside the window, shows the current value and moves between months", async ({
    page,
  }) => {
    await openSource(page, queryId);
    await field(page, "d").click();
    const popup = pickerPopup(page);
    await expect(popup.locator(".ant-picker-header-view")).toHaveText("Jan2026");
    await expect(popup.locator(".ant-picker-cell-selected")).toHaveAttribute("title", "2026-01-10");

    // Once the opening animation is over: a 7-column month below the field, fully inside the window
    const fieldBox = await field(page, "d").boundingBox();
    const viewport = page.viewportSize();
    if (!fieldBox || !viewport) {
      throw new Error("the date field is not visible");
    }
    await expect(async () => {
      const box = await popup.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(250);
        expect(box.width).toBeLessThan(320);
        expect(box.height).toBeGreaterThan(250);
        expect(box.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1);
        expect(box.y).toBeLessThan(fieldBox.y + fieldBox.height + 12);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }).toPass();
    await expect(popup.locator(".ant-picker-content thead th")).toHaveCount(7);

    await popup.locator(".ant-picker-header-prev-btn").click();
    await expect(popup.locator(".ant-picker-header-view")).toHaveText("Dec2025");
    await popup.locator(".ant-picker-header-next-btn").click();
    await popup.locator(".ant-picker-header-next-btn").click();
    await expect(popup.locator(".ant-picker-header-view")).toHaveText("Feb2026");

    await popup.locator(".ant-picker-month-btn").click();
    await expect(popup.locator(".ant-picker-month-panel .ant-picker-cell")).toHaveCount(12);
    await popup.locator(".ant-picker-cell").filter({ hasText: "Mar" }).click();
    await expect(popup.locator(".ant-picker-header-view")).toHaveText("Mar2026");

    // The day under the mouse is highlighted; today's ring and the selection are separate states
    const day = popup.locator('td[title="2026-03-15"]');
    const inner = day.locator(".ant-picker-cell-inner");
    const before = await inner.evaluate((element) => getComputedStyle(element).backgroundColor);
    await day.hover();
    await expect.poll(() => inner.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(before);
    await day.click();
    await expect(popup).toHaveCount(0);

    await field(page, "d").click();
    await expect(pickerPopup(page).locator(".ant-picker-cell-selected")).toHaveAttribute("title", "2026-03-15");
  });

  test("a typed date is accepted with Enter; an impossible date is rejected and nothing becomes pending", async ({
    page,
  }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);

    await field(page, "d").click();
    await expect(pickerPopup(page)).toBeVisible();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("99/99/99");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page
      .locator(".query-results-wrapper, .query-fixed-layout")
      .first()
      .click({ position: { x: 600, y: 300 } });
    await expect(pickerPopup(page)).toHaveCount(0);
    await expect(field(page, "d")).toHaveValue(shown(formats, INITIAL.d));
    await expect(valueInput(page, "d")).not.toHaveAttribute("data-dirty");
    await expectPending(page, 0);

    await typeDate(page, "d", shown(formats, "2026-02-01"));
    await expect(field(page, "d")).toHaveValue(shown(formats, "2026-02-01"));
    await expect(valueInput(page, "d")).toHaveAttribute("data-dirty", "true");
    await expectPending(page, 1);
    await apply(page);
    await expectRows(page, [{ ...INITIAL_ROW, d: "[2026-02-01]", dow: "Sunday" }]);
  });

  test("the time picker has hour/minute(/second) columns that fit the window; Now and OK set the value", async ({
    page,
  }) => {
    await page.clock.setFixedTime(NOW);
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("no viewport");
    }
    const popup = pickerPopup(page);
    const settledWidth = async () => {
      let width = 0;
      await expect(async () => {
        const box = await popup.boundingBox();
        const previous = width;
        width = box?.width ?? 0;
        expect(box).not.toBeNull();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
          // Same size on two looks in a row: the opening animation is over
          expect(box.width).toBeGreaterThan(200);
          expect(box.width).toBe(previous);
        }
      }).toPass();
      return width;
    };

    // Without seconds: two columns, the current value is selected in both
    await field(page, "dt").click();
    const columns = popup.locator(".ant-picker-time-panel-column");
    await expect(columns).toHaveCount(2);
    await expect(columns.nth(0).locator("li")).toHaveCount(24);
    await expect(columns.nth(1).locator("li")).toHaveCount(60);
    await expect(columns.nth(0).locator(".ant-picker-time-panel-cell-selected")).toHaveText("08");
    await expect(columns.nth(1).locator(".ant-picker-time-panel-cell-selected")).toHaveText("00");
    const widthWithoutSeconds = await settledWidth();

    // The columns scroll with the wheel and a value far down can be clicked
    await expect(async () => {
      const minutes = await columns.nth(1).boundingBox();
      if (!minutes) {
        throw new Error("the minutes column is not visible");
      }
      await page.mouse.move(minutes.x + minutes.width / 2, minutes.y + minutes.height / 2);
      await page.mouse.wheel(0, 2000);
      await expect(columns.nth(1).locator("li").last()).toBeInViewport({ timeout: 1000 });
    }).toPass();
    await columns.nth(1).locator("li").last().click();
    await expect(columns.nth(1).locator(".ant-picker-time-panel-cell-selected")).toHaveText("59");
    await pickTime(page, 0, "17");
    await popup.locator(".ant-picker-ok button").click();
    await expect(popup).toHaveCount(0);
    await expect(field(page, "dt")).toHaveValue(shown(formats, "2026-01-10 17:59"));

    // With seconds: a third column and a wider popup
    await field(page, "dts").click();
    await expect(columns).toHaveCount(3);
    await expect(columns.nth(2).locator("li")).toHaveCount(60);
    const widthWithSeconds = await settledWidth();
    expect(widthWithSeconds).toBeGreaterThan(widthWithoutSeconds + 40);

    // "Now" takes the current date and time
    await popup.locator(".ant-picker-now-btn").click();
    await expect(popup).toHaveCount(0);
    await expect(field(page, "dts")).toHaveValue(shown(formats, "2026-10-14 10:30:15"));

    await expectPending(page, 2);
    await apply(page);
    await expectRows(page, [
      {
        ...INITIAL_ROW,
        dt: "[2026-01-10 17:59]",
        dt_plus_1h: "[2026-01-10 18:59:00]",
        dts: "[2026-10-14 10:30:15]",
        dts_plus_1s: "[2026-10-14 10:30:16]",
      },
    ]);
  });
});

test.describe("Dynamic date values", () => {
  test("Yesterday and Today/Now are evaluated when the query runs, saved by name and can be made static again", async ({
    page,
    api,
    seed,
  }) => {
    const id = await createDatesQuery(api, seed.dataSources.postgres);
    await page.clock.setFixedTime(NOW);
    const formats = await openSource(page, id);
    await expectRows(page, [INITIAL_ROW]);

    let menu = await openDynamicMenu(page, "d");
    expect(await dynamicMenuItems(menu)).toEqual(["Today/Now Oct 14", "Yesterday Oct 13"]);
    await menu.locator("li").filter({ hasText: "Yesterday" }).click();
    await expect(field(page, "d")).toHaveValue("");
    await expect(field(page, "d")).toHaveAttribute("placeholder", "Yesterday");

    menu = await openDynamicMenu(page, "dts");
    await menu.locator("li").filter({ hasText: "Today/Now" }).click();
    await expect(field(page, "dts")).toHaveAttribute("placeholder", "Today/Now");
    await expectPending(page, 2);

    await apply(page);
    await expectRows(page, [
      {
        ...INITIAL_ROW,
        d: "[2026-10-13]",
        dow: "Tuesday",
        dts: "[2026-10-14 10:30:15]",
        dts_plus_1s: "[2026-10-14 10:30:16]",
      },
    ]);
    await expect(page).toHaveURL(/[?&]p_d=d_yesterday(&|$)/);
    await expect(page).toHaveURL(/[?&]p_dts=d_now(&|$)/);

    await saveQuery(page);
    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.value]))
      .toEqual([
        ["d", "d_yesterday"],
        ["dt", INITIAL.dt],
        ["dts", "d_now"],
      ]);

    // A day later the saved query gives the dates of that day
    await page.clock.setFixedTime(new Date(NOW.getTime() + 24 * 3600 * 1000));
    await openSource(page, id);
    await expect(field(page, "d")).toHaveAttribute("placeholder", "Yesterday");
    await expect(field(page, "d")).toHaveValue("");
    await expect(field(page, "dts")).toHaveAttribute("placeholder", "Today/Now");
    await expectRows(page, [
      {
        ...INITIAL_ROW,
        d: "[2026-10-14]",
        dow: "Wednesday",
        dts: "[2026-10-15 10:30:15]",
        dts_plus_1s: "[2026-10-15 10:30:16]",
      },
    ]);

    // "Back to Static Value" turns the dynamic value into the date it stands for now
    menu = await openDynamicMenu(page, "d");
    expect(await dynamicMenuItems(menu)).toEqual(["Today/Now Oct 15", "Yesterday Oct 14", "Back to Static Value"]);
    await menu.locator("li").filter({ hasText: "Back to Static Value" }).click();
    await expect(field(page, "d")).toHaveValue(shown(formats, "2026-10-14"));
    await expectPending(page, 1);
    await apply(page);
    await expect(page).toHaveURL(/[?&]p_d=2026-10-14(&|$)/);
    await expect(page).toHaveURL(/[?&]p_dts=d_now(&|$)/);
  });
});
