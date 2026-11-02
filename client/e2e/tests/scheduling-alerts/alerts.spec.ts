import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi, dismissToasts, retype, selectOptions, toast } from "../../support/ui";
import {
  alertMenu,
  alertRow,
  alertState,
  Created,
  createAlertViaApi,
  criteriaHint,
  criteriaSelect,
  criteriaShown,
  getAlert,
  openAlert,
  pick,
  refreshQuery,
  saveAlert,
  setSchedule,
  startEditing,
  threshold,
} from "./helpers";

test.describe("Alerts", () => {
  const created = new Created();
  /** `select 5 as v, 'low' as label`: v > 10 is false, v > 1 is true. */
  let queryId: number;
  let queryName: string;

  test.beforeAll(async ({ api, seed }) => {
    queryName = uniqueName("S alert value");
    queryId = (
      await createQueryViaApi(api, {
        name: queryName,
        dataSourceId: seed.dataSources.postgres,
        sql: "select 5 as v, 'low' as label",
      })
    ).id;
    created.queries.push(queryId);
  });

  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("a new alert is created from the query selector, the criteria and a threshold", async ({ page, api }) => {
    const name = uniqueName("S alert created in the UI");
    await page.goto("/alerts");
    await page.getByRole("link", { name: "New Alert" }).click();
    await expect(page).toHaveURL(/\/alerts\/new$/);
    const create = page.locator(".btn-create-alert");
    await expect(create).toBeDisabled();

    // The query selector searches while typing
    await byTest(page, "QuerySelector").click();
    await page.keyboard.type(queryName);
    await expect(selectOptions(page)).toHaveText([queryName]);
    await byTest(page, `QueryId${queryId}`).click();
    await expect(page.locator(".alert-query-selector")).toContainText(queryName);
    await expect(create).toBeEnabled();

    // Selector: the hint shows the value the alert would compare
    await expect(criteriaHint(page)).toContainText("Top row value is 5");
    await pick(page, criteriaSelect(page, 0), /^min$/);
    await expect(criteriaHint(page)).toContainText("Min column value is 5");
    await pick(page, criteriaSelect(page, 0), /^max$/);
    await expect(criteriaHint(page)).toContainText("Max column value is 5");
    await pick(page, criteriaSelect(page, 0), /^first$/);
    await expect(criteriaHint(page)).toContainText("Top row value is 5");

    // Value column: a text column cannot be compared with ">"
    await pick(page, criteriaSelect(page, 1), /^label$/);
    await expect(criteriaHint(page)).toContainText("Top row value is low");
    await expect(criteriaHint(page)).toContainText("Value column isn't supported by condition type.");
    await pick(page, criteriaSelect(page, 1), /^v$/);
    await expect(criteriaHint(page)).not.toContainText("isn't supported");

    // Threshold: text does not fit a numeric comparison
    await threshold(page).click();
    await retype(page, "abc");
    await expect(criteriaHint(page)).toContainText("Value column type doesn't match threshold type.");
    await threshold(page).click();
    await retype(page, "10");
    await expect(criteriaHint(page)).not.toContainText("doesn't match");

    // Condition: all six operators can be chosen; the closed dropdown shows the symbol
    for (const [option, symbol] of [
      [/greater than or equals/, "≥"],
      [/less than$/, "<"],
      [/less than or equals/, "≤"],
      [/^=\s*equals/, "="],
      [/not equal to/, "≠"],
      [/greater than$/, ">"],
      [/less than or equals/, "≤"],
    ] as const) {
      await pick(page, criteriaSelect(page, 2), option);
      await expect(criteriaSelect(page, 2).locator(".ant-select-selection-item")).toHaveText(symbol);
    }

    const title = page.getByLabel("Alert title");
    await expect(title).toHaveAttribute("placeholder", `${queryName}: v <= 10`);
    await title.fill(name);
    await create.click();
    await expect(page).toHaveURL(/\/alerts\/\d+$/);
    await expect(toast(page)).toContainText("Saved.");
    const id = Number(page.url().match(/\/alerts\/(\d+)/)?.[1]);
    created.alerts.push(id);

    const saved = await getAlert(api, id);
    expect(saved).toMatchObject({ name, state: "unknown", rearm: null });
    expect(saved.options).toMatchObject({ selector: "first", column: "v", op: "<=", muted: false });
    expect(String(saved.options.value)).toBe("10");

    // View mode shows what was chosen
    await expect(page.locator(".alert-title")).toHaveText(name);
    await expect(criteriaShown(page)).toHaveText(["first", "v", "≤", "10"]);
    await expect(alertState(page)).toContainText("Status: unknown");
    await expect(alertState(page)).toContainText("Alert condition has not been evaluated.");
    await expect(page.locator(".alert-query-link")).toContainText(queryName);
  });

  test("each notification frequency is saved and shown again in edit mode", async ({ page, api }) => {
    const alert = await createAlertViaApi(api, created, { name: uniqueName("S alert rearm"), queryId });
    const rearm = page.locator(".alert-rearm");
    const notifications = page.locator(".ant-form-item").filter({ hasText: "Notifications" }).last();
    await openAlert(page, alert.id);
    await expect(notifications).toContainText("Notifications are sent just once, until back to normal.");

    // At most every 5 minutes
    await startEditing(page);
    await expect(rearm.locator(".ant-select-selection-item").first()).toHaveText("Just once");
    await pick(page, rearm.locator(".ant-select").first(), /At most every/);
    await expect(rearm.locator(".ant-input-number input")).toHaveValue("1");
    await expect(rearm.locator(".ant-select-selection-item").nth(1)).toHaveText("Hour");
    await rearm.locator(".ant-input-number input").click();
    await retype(page, "5");
    await pick(page, rearm.locator(".ant-select").nth(1), /^Minutes$/);
    await saveAlert(page);
    expect((await getAlert(api, alert.id)).rearm).toBe(300);
    await expect(notifications).toContainText(
      "Notifications are sent at most every 5 minutes, when alert is evaluated."
    );

    // Edit mode opens with the saved values; change to "each time"
    await startEditing(page);
    await expect(rearm.locator(".ant-select-selection-item").first()).toHaveText("At most every");
    await expect(rearm.locator(".ant-input-number input")).toHaveValue("5");
    await expect(rearm.locator(".ant-select-selection-item").nth(1)).toHaveText("Minutes");
    await pick(page, rearm.locator(".ant-select").first(), /Each time alert is evaluated/);
    await expect(rearm.locator(".ant-input-number")).toHaveCount(0);
    await saveAlert(page);
    expect((await getAlert(api, alert.id)).rearm).toBe(1);
    await expect(notifications).toContainText(
      "Notifications are sent each time alert is evaluated, until back to normal."
    );

    // Back to "just once"
    await startEditing(page);
    await expect(rearm.locator(".ant-select-selection-item").first()).toHaveText("Each time alert is evaluated");
    await pick(page, rearm.locator(".ant-select").first(), /Just once/);
    await saveAlert(page);
    expect((await getAlert(api, alert.id)).rearm).toBeNull();
    await expect(notifications).toContainText("Notifications are sent just once, until back to normal.");
  });

  test("a custom template is previewed, saved, and discarded after confirmation", async ({ page, api, baseURL }) => {
    const name = uniqueName("S alert template");
    const alert = await createAlertViaApi(api, created, { name, queryId });
    const subject = "[S-alert] {{ALERT_NAME}} is {{ALERT_STATUS}}";
    const body =
      "Value {{QUERY_RESULT_VALUE}} {{ALERT_CONDITION}} threshold {{ALERT_THRESHOLD}}\n" +
      "Query: {{QUERY_NAME}} {{QUERY_URL}}\nAlert: {{ALERT_URL}}";
    const template = page.locator(".alert-template");
    const notifications = page.locator(".ant-form-item").filter({ hasText: "Notifications" }).last();

    await openAlert(page, alert.id);
    await expect(notifications).toContainText("Set to default notification template.");
    await startEditing(page);
    await expect(template.locator(".ant-select-selection-item")).toHaveText("Use default template");
    await expect(byTest(page, "AlertCustomTemplate")).toHaveCount(0);
    await pick(page, template.locator(".ant-select"), /Custom template/);
    await byTest(page, "CustomSubject").click();
    await page.keyboard.insertText(subject);
    await byTest(page, "CustomBody").click();
    await page.keyboard.insertText(body);

    // Preview renders the placeholders with the current result; the fields are read-only meanwhile
    await page.locator(".alert-template-preview").click();
    await expect(byTest(page, "CustomSubject")).toHaveValue(`[S-alert] ${name} is TRIGGERED`);
    await expect(byTest(page, "CustomSubject")).toBeDisabled();
    await expect(byTest(page, "CustomBody")).toHaveValue(
      `Value 5 > threshold 10\nQuery: ${queryName} ${baseURL}/queries/${queryId}\nAlert: ${baseURL}/alerts/${alert.id}`
    );
    await page.locator(".alert-template-preview").click();
    await expect(byTest(page, "CustomSubject")).toHaveValue(subject);
    await expect(byTest(page, "CustomBody")).toHaveValue(body);

    await saveAlert(page);
    expect((await getAlert(api, alert.id)).options).toMatchObject({ custom_subject: subject, custom_body: body });
    await expect(notifications).toContainText("Set to custom notification template.");

    // Back to the default template: asks first, then clears both fields
    await startEditing(page);
    await expect(template.locator(".ant-select-selection-item")).toHaveText("Use custom template");
    await expect(byTest(page, "CustomSubject")).toHaveValue(subject);
    await pick(page, template.locator(".ant-select"), /Default template/);
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Switching to default template will discard your custom template.");
    await confirm.locator(".ant-btn-primary").click();
    await expect(byTest(page, "AlertCustomTemplate")).toHaveCount(0);
    await saveAlert(page);
    const { options } = await getAlert(api, alert.id);
    expect(options.custom_subject ?? null).toBeNull();
    expect(options.custom_body ?? null).toBeNull();
    await expect(notifications).toContainText("Set to default notification template.");
  });

  test("an alert is muted from the menu, shown as muted in the list, and unmuted", async ({ page, api }) => {
    const name = uniqueName("S alert mute");
    const alert = await createAlertViaApi(api, created, { name, queryId });
    const banner = page.locator(".ant-alert").filter({ hasText: "Notifications are muted" });
    await openAlert(page, alert.id);
    await expect(banner).toHaveCount(0);

    await alertMenu(page, "Mute Notifications");
    await expect(toast(page)).toContainText("Notifications have been muted.");
    await expect(banner).toContainText("Notifications for this alert will not be sent.");
    expect((await getAlert(api, alert.id)).options.muted).toBe(true);
    await dismissToasts(page);

    await page.goto("/alerts");
    await expect(alertRow(page, name).locator('[title="Muted"] .fa-bell-slash')).toBeVisible();
    await alertRow(page, name).locator("a.table-main-title").click();
    await expect(page).toHaveURL(new RegExp(`/alerts/${alert.id}$`));

    await banner.getByRole("button", { name: "Unmute" }).click();
    await expect(toast(page)).toContainText("Notifications have been restored.");
    await expect(banner).toHaveCount(0);
    expect((await getAlert(api, alert.id)).options.muted).toBe(false);
    await page.goto("/alerts");
    await expect(alertRow(page, name).locator('[title="Active"] .fa-bell-o')).toBeVisible();
  });

  test("an alert is deleted from the menu after confirmation", async ({ page, api }) => {
    const name = uniqueName("S alert spare");
    const alert = await createAlertViaApi(api, created, { name, queryId });
    await openAlert(page, alert.id);

    await alertMenu(page, "Delete");
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Are you sure you want to delete this alert?");
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(toast(page)).toContainText("Alert deleted successfully.");
    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.locator(".page-alerts-list")).toBeVisible();
    await expect(alertRow(page, name)).toHaveCount(0);

    const all: { id: number }[] = await api.get("/api/alerts");
    expect(all.map((item) => item.id)).not.toContain(alert.id);
  });

  test("the list and the alert page show the UNKNOWN, OK and TRIGGERED states", async ({ page, api }) => {
    const names = {
      ok: uniqueName("S alert state ok"),
      triggered: uniqueName("S alert state triggered"),
      unknown: uniqueName("S alert state unknown"),
    };
    // v is 5: "v > 10" is fine, "v > 1" triggers. An alert is evaluated whenever its query gets a new result.
    const ok = await createAlertViaApi(api, created, { name: names.ok, queryId, options: { value: 10 } });
    const triggered = await createAlertViaApi(api, created, {
      name: names.triggered,
      queryId,
      options: { value: 1 },
    });
    await refreshQuery(api, queryId);
    await expect.poll(async () => (await getAlert(api, ok.id)).state).toBe("ok");
    await expect.poll(async () => (await getAlert(api, triggered.id)).state).toBe("triggered");
    // Created after the last result, so not evaluated yet
    await createAlertViaApi(api, created, { name: names.unknown, queryId });

    await page.goto("/alerts");
    await expect(alertRow(page, names.ok).locator(".label")).toHaveText("OK");
    await expect(alertRow(page, names.ok).locator(".label")).toHaveClass(/label-success/);
    await expect(alertRow(page, names.triggered).locator(".label")).toHaveText("TRIGGERED");
    await expect(alertRow(page, names.triggered).locator(".label")).toHaveClass(/label-danger/);
    await expect(alertRow(page, names.unknown).locator(".label")).toHaveText("UNKNOWN");
    await expect(alertRow(page, names.unknown).locator(".label")).toHaveClass(/label-warning/);

    await alertRow(page, names.triggered).locator("a.table-main-title").click();
    await expect(page).toHaveURL(new RegExp(`/alerts/${triggered.id}$`));
    await expect(alertState(page).locator(".alert-state-indicator")).toHaveText("Status: triggered");
    await expect(alertState(page).locator(".alert-state-indicator")).toHaveClass(/label-danger/);
    await expect(alertState(page)).toContainText("Last triggered");
    await expect(criteriaHint(page)).toContainText("Top row value is 5");
    await expect(criteriaShown(page)).toHaveText(["first", "v", ">", "1"]);
  });

  test("the alert page tells whether its query has a refresh schedule", async ({ page, api, seed }) => {
    const { id: scheduledQuery } = await createQueryViaApi(api, {
      name: uniqueName("S alert scheduled query"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 7 as v",
    });
    created.queries.push(scheduledQuery);
    // Far in the future, so the scheduler never actually runs it during the tests
    await setSchedule(api, scheduledQuery, { interval: 2592000, time: null, day_of_week: null, until: null });
    const withSchedule = await createAlertViaApi(api, created, {
      name: uniqueName("S alert with schedule"),
      queryId: scheduledQuery,
    });
    const withoutSchedule = await createAlertViaApi(api, created, {
      name: uniqueName("S alert without schedule"),
      queryId,
    });
    const hint = page.locator(".ant-form-item").filter({ hasText: "Query" }).first().locator(".ant-form-item-explain");

    await openAlert(page, withSchedule.id);
    await expect(hint.first()).toHaveText("Scheduled to refresh Every 30 days");
    await openAlert(page, withoutSchedule.id);
    await expect(hint.first()).toContainText("This query has no refresh schedule.");
  });

  test("Cancel in edit mode saves nothing", async ({ page, api }) => {
    const alert = await createAlertViaApi(api, created, { name: uniqueName("S alert cancel"), queryId });
    await openAlert(page, alert.id);
    await startEditing(page);
    await threshold(page).click();
    await retype(page, "999");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(new RegExp(`/alerts/${alert.id}$`));
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    expect(String((await getAlert(api, alert.id)).options.value)).toBe("10");

    await page.reload();
    await expect(criteriaShown(page)).toHaveText(["first", "v", ">", "10"]);
  });

  test("Cancel in edit mode shows the saved values again", async ({ page, api }) => {
    knownIssue("alert-cancel-keeps-edits");
    const alert = await createAlertViaApi(api, created, { name: uniqueName("S alert cancel view"), queryId });
    await openAlert(page, alert.id);
    await expect(criteriaShown(page).nth(3)).toHaveText("10");
    await startEditing(page);
    await threshold(page).click();
    await retype(page, "999");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(new RegExp(`/alerts/${alert.id}$`));
    await expect(criteriaShown(page)).toHaveCount(4);
    // The bug: view mode keeps showing 999 until the page is reloaded
    await expect(criteriaShown(page).nth(3)).toHaveText("10", { timeout: 3000 });
  });
});
