import type { Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { byTest, createQueryViaApi, dismissToasts, pick, toast } from "../../support/ui";
import { listRows, uniqueToken } from "./helpers";

const DATE_PATTERNS: Record<string, string> = {
  "DD/MM/YY": "\\d{2}/\\d{2}/\\d{2}",
  "MM/DD/YY": "\\d{2}/\\d{2}/\\d{2}",
  "YYYY-MM-DD": "\\d{4}-\\d{2}-\\d{2}",
};
const TIME_PATTERNS: Record<string, string> = {
  "HH:mm": "\\d{2}:\\d{2}",
  "HH:mm:ss": "\\d{2}:\\d{2}:\\d{2}",
  "HH:mm:ss.SSS": "\\d{2}:\\d{2}:\\d{2}\\.\\d{3}",
};
const FLAGS = ["feature_show_permissions_control", "send_email_on_failed_scheduled_queries"] as const;

const checkbox = (page: Page, name: string) => page.locator(`input[type="checkbox"][name="${name}"]`);
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

async function save(page: Page) {
  await byTest(page, "OrganizationSettingsSaveButton").click();
  await expect(toast(page)).toContainText("Settings changes saved.");
  await dismissToasts(page);
}

test.describe("Settings > General", () => {
  /**
   * This changes settings of the whole organization while other tests run, so: it changes only settings that
   * cannot break another test (the date and time format, two feature flags that only add a control or an
   * email), keeps them changed for a few seconds, and puts everything back even when it fails.
   */
  test("date and time format and feature flags are saved, persist, apply to the lists, and are restored", async ({
    page,
    api,
    seed,
  }) => {
    const token = uniqueToken("aorg");
    await createQueryViaApi(api, {
      name: `A ${token} settings query`,
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as a",
      run: false,
    });
    const settings = async () => (await api.get("/api/settings/organization")).settings;
    const before = await settings();
    const date = before.date_format === "YYYY-MM-DD" ? "DD/MM/YY" : "YYYY-MM-DD";
    const time = before.time_format === "HH:mm:ss.SSS" ? "HH:mm" : "HH:mm:ss.SSS";
    const createdAt = async () => {
      await page.goto(`/queries?q=${token}`);
      await expect(listRows(page)).toHaveCount(1);
      // Columns: star, name, created by, created at, last executed at, refresh schedule
      return listRows(page).locator("td").nth(3);
    };
    const shown = (dateFormat: string, timeFormat: string) =>
      new RegExp(`^${DATE_PATTERNS[dateFormat]} ${TIME_PATTERNS[timeFormat]}$`);

    await expect(await createdAt()).toHaveText(shown(before.date_format, before.time_format));

    await page.goto("/settings/general");
    await expect(byTest(page, "DateFormatSelect")).toContainText(before.date_format);
    await expect(byTest(page, "TimeFormatSelect")).toContainText(before.time_format);
    for (const flag of FLAGS) {
      await expect(checkbox(page, flag)).toBeChecked({ checked: !!before[flag] });
    }
    // The time formats are all 24-hour ones
    await byTest(page, "TimeFormatSelect").locator(".ant-select-selector").click();
    // In no particular order: the server builds the list from a set, so the order changes between server processes
    const timeFormats = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option");
    await expect(timeFormats).toHaveCount(3);
    expect((await timeFormats.allTextContents()).sort()).toEqual(["HH:mm", "HH:mm:ss", "HH:mm:ss.SSS"]);
    await page.keyboard.press("Escape");

    try {
      await pick(page, byTest(page, "DateFormatSelect"), exactly(date));
      await pick(page, byTest(page, "TimeFormatSelect"), exactly(time));
      for (const flag of FLAGS) {
        await checkbox(page, flag).click();
      }
      await save(page);
      expect(await settings()).toMatchObject({
        date_format: date,
        time_format: time,
        ...Object.fromEntries(FLAGS.map((flag) => [flag, !before[flag]])),
      });

      // Applied: the list shows the new format
      await expect(await createdAt()).toHaveText(shown(date, time));

      // Persisted: a freshly loaded form shows the saved values
      await page.goto("/settings/general");
      await expect(byTest(page, "DateFormatSelect")).toContainText(date);
      await expect(byTest(page, "TimeFormatSelect").locator(".ant-select-selection-item")).toHaveText(time);
      for (const flag of FLAGS) {
        await expect(checkbox(page, flag)).toBeChecked({ checked: !before[flag] });
      }

      // Put everything back through the form
      await pick(page, byTest(page, "DateFormatSelect"), exactly(before.date_format));
      await pick(page, byTest(page, "TimeFormatSelect"), exactly(before.time_format));
      for (const flag of FLAGS) {
        await checkbox(page, flag).click();
      }
      await save(page);
    } finally {
      // Whatever happened above, the organization gets its settings back
      await api.post("/api/settings/organization", {
        date_format: before.date_format,
        time_format: before.time_format,
        ...Object.fromEntries(FLAGS.map((flag) => [flag, !!before[flag]])),
      });
    }

    const after = await settings();
    expect(after.date_format).toBe(before.date_format);
    expect(after.time_format).toBe(before.time_format);
    for (const flag of FLAGS) {
      expect(!!after[flag], flag).toBe(!!before[flag]);
    }
    await expect(await createdAt()).toHaveText(shown(before.date_format, before.time_format));
  });

  test("the form has no option to disable public URLs", async ({ page }) => {
    await page.goto("/settings/general");
    await expect(byTest(page, "OrganizationSettingsSaveButton")).toBeVisible();
    await expect(checkbox(page, "hide_plotly_mode_bar")).toBeVisible();
    await expect(byTest(page, "OrganizationSettings").getByText(/public url/i)).toHaveCount(0);
  });
});
