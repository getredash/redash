import { ADMIN } from "../../support/env";
import { expect, type Mail, mailbox, type RedashApi, test, uniqueName, webhooks } from "../../support/fixtures";
import { createQueryViaApi, dismissToasts, toast } from "../../support/ui";
import {
  type AlertInfo,
  alertMenu,
  alertRow,
  alertState,
  Created,
  createAlertViaApi,
  createDestinationPair,
  createValueTable,
  criteriaHint,
  everyMinute,
  getAlert,
  openAlert,
  refreshQuery,
  serverTime,
  setSchedule,
  setValue,
  subscribe,
} from "./helpers";

interface HookBody {
  event: string;
  url_base: string;
  metadata: Record<string, unknown>;
  alert: { id: number; name: string; state: string; title: string; description: string; query_id: number };
}

test.describe("Alert notifications", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    // Deletes the alerts and removes the schedule, so nothing keeps firing after the tests
    await created.cleanup(api, seed.dataSources.postgres);
  });

  /**
   * A table holding one value (5), a query on it, an alert "v > 10" on the query, and an Email and a Webhook
   * destination subscribed to the alert. The alert starts in the OK state.
   */
  async function setUp(
    api: RedashApi,
    postgresId: number,
    alertOptions: { rearm?: number | null; options?: Partial<AlertInfo["options"]>; ownerEmail?: boolean } = {}
  ) {
    const table = await createValueTable(api, postgresId, created);
    const queryName = uniqueName("S alert value");
    const { id: queryId } = await createQueryViaApi(api, {
      name: queryName,
      dataSourceId: postgresId,
      sql: `select v, label, now() as checked_at from ${table}`,
    });
    created.queries.push(queryId);
    const name = uniqueName("S alert v gt 10");
    const alert = await createAlertViaApi(api, created, {
      name,
      queryId,
      rearm: alertOptions.rearm,
      options: alertOptions.options,
    });
    const destinations = await createDestinationPair(api, created);
    await subscribe(api, alert.id, destinations.email.id);
    await subscribe(api, alert.id, destinations.webhook.id);
    if (alertOptions.ownerEmail) {
      await subscribe(api, alert.id);
    }
    // The first evaluation: unknown -> ok, which notifies nobody
    await refreshQuery(api, queryId);
    await expect.poll(async () => (await getAlert(api, alert.id)).state).toBe("ok");

    const hooks = async (): Promise<HookBody[]> =>
      (await webhooks.all()).filter((request) => request.path === destinations.hookPath).map((r) => JSON.parse(r.body));
    const mails = async (): Promise<Mail[]> =>
      (await mailbox.all()).filter((mail) => mailbox.sentTo(destinations.addresses[0])(mail));
    /** Changes the value and runs the query again, which evaluates the alert. */
    const setAndRefresh = async (v: number, label: string) => {
      await setValue(api, postgresId, table, v, label);
      await refreshQuery(api, queryId);
    };
    const state = async () => (await getAlert(api, alert.id)).state;
    return { table, queryId, queryName, alertId: alert.id, name, ...destinations, hooks, mails, setAndRefresh, state };
  }

  test("@slow a scheduled refresh triggers the alert and recovers it, with an email and a webhook each time", async ({
    page,
    api,
    seed,
    baseURL,
  }) => {
    // The scheduler looks for due queries every 30 s and a 1-minute query is due 60 s after its last result,
    // so each change is noticed within about 90 s
    test.setTimeout(7 * 60_000);
    const postgres = seed.dataSources.postgres;
    const rig = await setUp(api, postgres, {
      ownerEmail: true,
      options: {
        custom_subject: "[S-alert] {{ALERT_NAME}} is {{ALERT_STATUS}}",
        custom_body:
          "Value {{QUERY_RESULT_VALUE}} {{ALERT_CONDITION}} threshold {{ALERT_THRESHOLD}}\n" +
          "Query: {{QUERY_NAME}} {{QUERY_URL}}\nAlert: {{ALERT_URL}}",
      },
    });
    await setSchedule(api, rig.queryId, everyMinute);

    const expectNotifications = async (status: "TRIGGERED" | "OK", value: number, hookCount: number) => {
      const subject = `[S-alert] ${rig.name} is ${status}`;
      // One mail to the two addresses of the Email destination, one to the alert's owner
      const toDestination = await mailbox.waitFor(
        (mail) => mail.subject === subject && !mailbox.sentTo(ADMIN.email)(mail)
      );
      expect(toDestination.to.map((recipient) => recipient.address).sort()).toEqual([...rig.addresses].sort());
      // Values of a custom template are HTML-escaped
      expect(toDestination.html).toContain(`Value ${value} &gt; threshold 10`);
      expect(toDestination.html).toContain(`Query: ${rig.queryName} `);
      expect(toDestination.html).toMatch(new RegExp(`Alert: \\S+/alerts/${rig.alertId}`));
      const toOwner = await mailbox.waitFor((mail) => mail.subject === subject && mailbox.sentTo(ADMIN.email)(mail));
      expect(toOwner.to.map((recipient) => recipient.address)).toEqual([ADMIN.email]);
      expect(toOwner.html).toContain(`Value ${value} &gt; threshold 10`);

      await webhooks.waitFor(rig.hookPath, hookCount);
      const hooks = await rig.hooks();
      expect(hooks).toHaveLength(hookCount);
      const hook = hooks[hookCount - 1];
      expect(hook.event).toBe("alert_state_change");
      expect(hook.alert).toMatchObject({
        id: rig.alertId,
        name: rig.name,
        state: status.toLowerCase(),
        query_id: rig.queryId,
        title: subject,
      });
      expect(hook.alert.description).toContain(`Value ${value} &gt; threshold 10`);
      expect(hook.url_base).toMatch(/^https?:\/\/\S+/);
      // It was the scheduler that ran the query, not a person
      expect(hook.metadata.Scheduled).toBe(true);
      return toDestination;
    };

    // Make the condition true and wait for the scheduler
    await setValue(api, postgres, rig.table, 50, "high");
    await expect
      .poll(rig.state, { timeout: 150_000, intervals: [3000], message: "the alert triggers on a scheduled refresh" })
      .toBe("triggered");
    await openAlert(page, rig.alertId);
    await expect(alertState(page).locator(".alert-state-indicator")).toHaveText("Status: triggered");
    await expect(alertState(page)).toContainText(
      /Last triggered\s*(just now|a few seconds ago|\d+ seconds ago|a minute ago)/
    );
    await expect(criteriaHint(page)).toContainText("Top row value is 50");
    await expect(page.locator(".alert-query-schedule")).toHaveText("Every minute");
    await page.goto("/alerts");
    await expect(alertRow(page, rig.name).locator(".label")).toHaveText("TRIGGERED");
    const triggeredMail = await expectNotifications("TRIGGERED", 50, 1);
    expect(triggeredMail.html).toContain(`${baseURL}/queries/${rig.queryId}`);

    // Back to normal
    await setValue(api, postgres, rig.table, 5, "low");
    await expect
      .poll(rig.state, { timeout: 150_000, intervals: [3000], message: "the alert recovers on a scheduled refresh" })
      .toBe("ok");
    await openAlert(page, rig.alertId);
    await expect(alertState(page).locator(".alert-state-indicator")).toHaveText("Status: ok");
    await expect(criteriaHint(page)).toContainText("Top row value is 5");
    await page.goto("/alerts");
    await expect(alertRow(page, rig.name).locator(".label")).toHaveText("OK");
    await expectNotifications("OK", 5, 2);

    // "Just once": exactly one mail per state change reached the destination, however often the query ran
    expect((await rig.mails()).map((mail) => mail.subject)).toEqual([
      `[S-alert] ${rig.name} is TRIGGERED`,
      `[S-alert] ${rig.name} is OK`,
    ]);
  });

  test("the default template sends the alert name, condition, query link and result", async ({
    api,
    seed,
    baseURL,
  }) => {
    const rig = await setUp(api, seed.dataSources.postgres);
    await rig.setAndRefresh(50, "high");
    await expect.poll(rig.state).toBe("triggered");

    const mail = await mailbox.waitFor(mailbox.sentTo(rig.addresses[0]));
    expect(mail.subject).toBe(`Alert: ${rig.name} changed status to TRIGGERED`);
    expect(mail.to.map((recipient) => recipient.address).sort()).toEqual([...rig.addresses].sort());
    const text = mail.html
      .replace(/<[^>]+>/g, " ")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ");
    expect(text).toContain("STATUS: TRIGGERED");
    expect(text).toContain("CONDITION: 50 > 10");
    expect(text).toContain(`QUERY: ${rig.queryName}`);
    expect(mail.html).toContain(`${baseURL}/queries/${rig.queryId}`);
    // The result table: column names and the row
    expect(text).toMatch(/v\s+label\s+checked_at/);
    expect(text).toMatch(/50\s+high/);

    const [hook] = await webhooks.waitFor(rig.hookPath, 1).then(rig.hooks);
    expect(hook.event).toBe("alert_state_change");
    expect(hook.alert).toMatchObject({ id: rig.alertId, state: "triggered", title: "", description: "" });
    // A person ran the query this time
    expect(hook.metadata.Scheduled).toBe(false);
  });

  test("'Just once' does not notify again while the alert stays triggered", async ({ api, seed }) => {
    const rig = await setUp(api, seed.dataSources.postgres, { rearm: null });
    await rig.setAndRefresh(50, "high");
    await expect.poll(rig.state).toBe("triggered");
    await webhooks.waitFor(rig.hookPath, 1);

    // Two more evaluations while the value is still too high
    await refreshQuery(api, rig.queryId);
    await rig.setAndRefresh(60, "higher");
    // Recovery is the next thing that notifies; evaluations are processed in order, so by the time it arrives
    // the two above are over
    await rig.setAndRefresh(5, "low");
    await expect.poll(rig.state).toBe("ok");
    await webhooks.waitFor(rig.hookPath, 2);
    expect((await rig.hooks()).map((hook) => hook.alert.state)).toEqual(["triggered", "ok"]);
    await mailbox.waitFor((mail) => mailbox.sentTo(rig.addresses[0])(mail) && / OK$/.test(mail.subject));
    expect((await rig.mails()).map((mail) => mail.subject)).toEqual([
      `Alert: ${rig.name} changed status to TRIGGERED`,
      `Alert: ${rig.name} changed status to OK`,
    ]);
  });

  test("'Each time alert is evaluated' notifies on every evaluation while triggered", async ({ api, seed }) => {
    const rig = await setUp(api, seed.dataSources.postgres, { rearm: 1 });
    await rig.setAndRefresh(50, "high");
    await expect.poll(rig.state).toBe("triggered");
    await webhooks.waitFor(rig.hookPath, 1);
    const firstTriggeredAt = (await getAlert(api, rig.alertId)).last_triggered_at;

    // The alert re-arms one second after it fired (by the server's clock); the next evaluation after that
    // notifies again
    const firedAt = new Date(firstTriggeredAt as string).getTime();
    await expect
      .poll(() => serverTime(api, seed.dataSources.postgres), { intervals: [250] })
      .toBeGreaterThan(firedAt + 1500);
    await refreshQuery(api, rig.queryId);
    await webhooks.waitFor(rig.hookPath, 2);
    expect((await rig.hooks()).map((hook) => hook.alert.state)).toEqual(["triggered", "triggered"]);
    await expect
      .poll(async () => (await rig.mails()).map((mail) => mail.subject))
      .toEqual([`Alert: ${rig.name} changed status to TRIGGERED`, `Alert: ${rig.name} changed status to TRIGGERED`]);
    expect((await getAlert(api, rig.alertId)).last_triggered_at).not.toBe(firstTriggeredAt);
  });

  test("a muted alert changes state silently, and Evaluate sends a notification", async ({ page, api, seed }) => {
    const rig = await setUp(api, seed.dataSources.postgres);
    await openAlert(page, rig.alertId);
    await alertMenu(page, "Mute Notifications");
    await expect(toast(page)).toContainText("Notifications have been muted.");
    await dismissToasts(page);

    // Triggered and back to normal while muted
    await rig.setAndRefresh(50, "high");
    await expect.poll(rig.state).toBe("triggered");
    await page.reload();
    await expect(alertState(page).locator(".alert-state-indicator")).toHaveText("Status: triggered");
    await expect(page.locator(".ant-alert").filter({ hasText: "Notifications are muted" })).toBeVisible();
    await rig.setAndRefresh(5, "low");
    await expect.poll(rig.state).toBe("ok");

    await page.reload();
    await expect(alertState(page).locator(".alert-state-indicator")).toHaveText("Status: ok");
    await alertMenu(page, "Unmute Notifications");
    await expect(toast(page)).toContainText("Notifications have been restored.");
    await dismissToasts(page);

    // Evaluate always notifies, also when the state did not change
    const evaluated = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().endsWith(`/api/alerts/${rig.alertId}/eval`)
    );
    await alertMenu(page, "Evaluate");
    expect((await evaluated).status()).toBe(200);
    await expect(toast(page)).toContainText("Alert evaluated. Refresh page for updated status.");

    // That notification is the only one: nothing was sent for the two state changes while muted
    await webhooks.waitFor(rig.hookPath, 1);
    const hooks = await rig.hooks();
    expect(hooks.map((hook) => hook.alert.state)).toEqual(["ok"]);
    expect(hooks[0].metadata).toEqual({});
    await mailbox.waitFor(mailbox.sentTo(rig.addresses[0]));
    expect((await rig.mails()).map((mail) => mail.subject)).toEqual([`Alert: ${rig.name} changed status to OK`]);
  });
});
