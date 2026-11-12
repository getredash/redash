import type { Page } from "@playwright/test";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { createQueryViaApi } from "../../support/ui";
import {
  browserTimeToUtc,
  Created,
  confirmSchedule,
  getQuery,
  intervalSelect,
  openScheduleDialog,
  pickInterval,
  pickTime,
  type Schedule,
  scheduleLink,
  scheduleTooltip,
  setSchedule,
  utcToBrowserTime,
} from "./helpers";

test.describe("Refresh Schedule dialog", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    // Removes the schedules too, so nothing keeps refreshing after the tests
    await created.cleanup(api, seed.dataSources.postgres);
  });

  /** A query to schedule (optionally with a schedule already saved), opened on its view page. */
  async function openQuery(page: Page, api: RedashApi, postgresId: number, schedule: Schedule | null = null) {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("S schedule"),
      dataSourceId: postgresId,
      sql: "select now() as ran_at, 1 as one",
    });
    created.queries.push(id);
    if (schedule) {
      await setSchedule(api, id, schedule);
    }
    await page.goto(`/queries/${id}`);
    await expect(scheduleLink(page)).toBeVisible();
    return id;
  }

  const savedSchedule = (api: RedashApi, id: number) => async () => (await getQuery(api, id)).schedule;
  const checkedWeekdays = (page: Page) =>
    page
      .locator('[data-testid="weekday"] .ant-radio-button-wrapper')
      .evaluateAll((days) => days.flatMap((day, index) => (day.className.includes("checked") ? [index] : [])));

  test("every 1 minute is stored as 60 seconds and shown as 'Every minute'", async ({ page, api, seed }) => {
    const id = await openQuery(page, api, seed.dataSources.postgres);
    await expect(scheduleLink(page)).toHaveText("Never");

    const dialog = await openScheduleDialog(page);
    await expect(intervalSelect(dialog).locator(".ant-select-selection-item")).toHaveText("Never");
    // "Never" has nothing else to choose
    await expect(dialog.locator('[data-testid="time"], [data-testid="weekday"], [data-testid="ends"]')).toHaveCount(0);

    await pickInterval(page, dialog, "1 minute");
    await expect(dialog.locator('[data-testid="time"], [data-testid="weekday"]')).toHaveCount(0);
    await expect(dialog.locator('[data-testid="ends"]')).toBeVisible();
    await confirmSchedule(page, dialog);

    await expect.poll(savedSchedule(api, id)).toEqual({ interval: 60, time: null, day_of_week: null, until: null });
    await expect(scheduleLink(page)).toHaveText("Every minute");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every minute");
  });

  test("5 minutes and 1 hour are stored in seconds and have no time or day fields", async ({ page, api, seed }) => {
    const id = await openQuery(page, api, seed.dataSources.postgres);

    let dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "5 minutes");
    await expect(dialog.locator('[data-testid="time"], [data-testid="weekday"]')).toHaveCount(0);
    await confirmSchedule(page, dialog);
    await expect.poll(savedSchedule(api, id)).toMatchObject({ interval: 300, time: null, day_of_week: null });
    await expect(scheduleLink(page)).toHaveText("Every 5 minutes");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every 5 minutes");

    dialog = await openScheduleDialog(page);
    await expect(intervalSelect(dialog).locator(".ant-select-selection-item")).toHaveText("5 minutes");
    await pickInterval(page, dialog, "1 hour");
    await expect(dialog.locator('[data-testid="time"], [data-testid="weekday"]')).toHaveCount(0);
    await confirmSchedule(page, dialog);
    await expect.poll(savedSchedule(api, id)).toMatchObject({ interval: 3600, time: null, day_of_week: null });
    await expect(scheduleLink(page)).toHaveText("Every hour");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every hour");
  });

  test("a daily schedule stores the time in UTC and shows it in local time", async ({ page, api, seed }) => {
    const id = await openQuery(page, api, seed.dataSources.postgres);
    const utc = await browserTimeToUtc(page, "14:35");
    // The config runs the browser in Asia/Jerusalem, so local time is not UTC and the two must differ
    expect(utc).not.toBe("14:35");

    let dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "1 day");
    await expect(dialog.locator('[data-testid="weekday"]')).toHaveCount(0);
    // The time defaults to 00:15 local
    await expect(dialog.locator('[data-testid="time"] input')).toHaveValue("00:15");
    await pickTime(page, dialog, "14", "35");
    await expect(dialog.locator('[data-testid="utc"]')).toHaveText(`(${utc} UTC)`);
    await confirmSchedule(page, dialog);

    await expect.poll(savedSchedule(api, id)).toEqual({ interval: 86400, time: utc, day_of_week: null, until: null });
    expect(await utcToBrowserTime(page, utc)).toBe("14:35");
    await expect(scheduleLink(page)).toHaveText("Every day");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every day at 14:35");

    await page.reload();
    await expect(scheduleLink(page)).toHaveText("Every day");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every day at 14:35");
    dialog = await openScheduleDialog(page);
    await expect(intervalSelect(dialog).locator(".ant-select-selection-item")).toHaveText("1 day");
    await expect(dialog.locator('[data-testid="time"] input')).toHaveValue("14:35");
    await expect(dialog.locator('[data-testid="utc"]')).toHaveText(`(${utc} UTC)`);
  });

  test("a weekly schedule stores one weekday and the time", async ({ page, api, seed }) => {
    const id = await openQuery(page, api, seed.dataSources.postgres);
    const utc = await browserTimeToUtc(page, "09:05");

    let dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "1 week");
    const weekdays = dialog.locator('[data-testid="weekday"] .ant-radio-button-wrapper');
    await expect(weekdays).toHaveText(["S", "M", "T", "W", "T", "F", "S"]);
    expect(await checkedWeekdays(page), "Sunday is chosen by default").toEqual([0]);
    await weekdays.nth(3).click();
    expect(await checkedWeekdays(page)).toEqual([3]);
    await pickTime(page, dialog, "09", "05");
    await confirmSchedule(page, dialog);

    await expect
      .poll(savedSchedule(api, id))
      .toEqual({ interval: 604800, time: utc, day_of_week: "Wednesday", until: null });
    await expect(scheduleLink(page)).toHaveText("Every week");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every week at 09:05 on Wednesday");

    // The days are a single choice: another day replaces the first one
    dialog = await openScheduleDialog(page);
    expect(await checkedWeekdays(page)).toEqual([3]);
    await dialog.locator('[data-testid="weekday"] .ant-radio-button-wrapper').nth(5).click();
    expect(await checkedWeekdays(page)).toEqual([5]);
    await confirmSchedule(page, dialog);
    await expect.poll(savedSchedule(api, id)).toMatchObject({ interval: 604800, time: utc, day_of_week: "Friday" });
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every week at 09:05 on Friday");
  });

  test("an end date picked in the calendar is stored and restored", async ({ page, api, seed }) => {
    const id = await openQuery(page, api, seed.dataSources.postgres);
    const { today, nextMonth20th } = await page.evaluate(() => {
      const format = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const now = new Date();
      return { today: format(now), nextMonth20th: format(new Date(now.getFullYear(), now.getMonth() + 1, 20)) };
    });

    let dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "1 hour");
    const ends = dialog.locator('[data-testid="ends"]');
    await expect(ends.locator(".ant-radio-wrapper-checked")).toHaveText("Never");
    await expect(ends.locator(".ant-picker")).toHaveCount(0);
    await ends.locator(".ant-radio-wrapper").filter({ hasText: "On" }).click();
    await expect(ends.locator(".ant-picker input")).toHaveValue(today);

    await ends.locator(".ant-picker").click();
    const calendar = page.locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)");
    await calendar.locator(".ant-picker-header-next-btn").click();
    await calendar.locator(`td[title="${nextMonth20th}"]`).click();
    await expect(ends.locator(".ant-picker input")).toHaveValue(nextMonth20th);
    await confirmSchedule(page, dialog);

    await expect
      .poll(savedSchedule(api, id))
      .toEqual({ interval: 3600, time: null, day_of_week: null, until: nextMonth20th });
    // The footer never mentions the end date
    await expect(scheduleLink(page)).toHaveText("Every hour");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every hour");

    await page.reload();
    dialog = await openScheduleDialog(page);
    await expect(dialog.locator('[data-testid="ends"] .ant-radio-wrapper-checked')).toHaveText("On");
    await expect(dialog.locator('[data-testid="ends"] .ant-picker input')).toHaveValue(nextMonth20th);
  });

  test("Cancel keeps the schedule, the source view shows it, and 'Never' removes it", async ({ page, api, seed }) => {
    const fiveMinutes = { interval: 300, time: null, day_of_week: null, until: null };
    const id = await openQuery(page, api, seed.dataSources.postgres, fiveMinutes);
    await expect(scheduleLink(page)).toHaveText("Every 5 minutes");

    let dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "1 hour");
    await dialog.locator(".ant-modal-footer .ant-btn").filter({ hasText: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(scheduleLink(page)).toHaveText("Every 5 minutes");
    expect((await getQuery(api, id)).schedule).toEqual(fiveMinutes);
    // The cancelled choice is not kept for the next time the dialog opens either
    dialog = await openScheduleDialog(page);
    await expect(intervalSelect(dialog).locator(".ant-select-selection-item")).toHaveText("5 minutes");
    await dialog.locator(".ant-modal-footer .ant-btn").filter({ hasText: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    await page.goto(`/queries/${id}/source`);
    await expect(scheduleLink(page)).toHaveText("Every 5 minutes");
    await expect(await scheduleTooltip(page)).toHaveText("Refreshes every 5 minutes");

    dialog = await openScheduleDialog(page);
    await pickInterval(page, dialog, "Never");
    await expect(dialog.locator('[data-testid="ends"]')).toHaveCount(0);
    await confirmSchedule(page, dialog);
    await expect.poll(savedSchedule(api, id)).toBeNull();
    await expect(scheduleLink(page)).toHaveText("Never");

    await page.reload();
    await expect(scheduleLink(page)).toHaveText("Never");
    expect((await getQuery(api, id)).schedule).toBeNull();
  });
});
