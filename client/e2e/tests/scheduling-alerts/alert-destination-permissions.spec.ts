import type { Browser, Page } from "@playwright/test";
import { expect, type Guard, RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi } from "../../support/ui";
import { createLimitedUser, loginAs, removeUser, type TestUser } from "../admin/helpers";
import { Created, createAlertViaApi, createDestinationViaApi, subscribe } from "./helpers";

/** The row of the destination in the alert page's destination list, and its "remove" button. */
const destinationRow = (page: Page, name: string) =>
  byTest(page, "AlertDestinations").locator("li").filter({ hasText: name });
const removeButton = (page: Page, name: string) => destinationRow(page, name).locator(".remove-button");

test.describe("Alert destination permissions", () => {
  const created = new Created();
  let user: TestUser;
  let group: { id: number };
  let userApi: RedashApi;
  let alertId: number;
  let destinationName: string;
  let destinationId: number;

  test.beforeAll(async ({ api, seed, baseURL }) => {
    // The seeded viewer cannot be used: it is not meant to change anything, and here it has to subscribe
    ({ user, group } = await createLimitedUser(api, seed.dataSources.postgres, { prefix: "S Subscriber" }));
    userApi = await RedashApi.login(baseURL, user);
    const query = await createQueryViaApi(api, {
      name: uniqueName("S permissions query"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as col_name",
    });
    created.queries.push(query.id);
    alertId = (
      await createAlertViaApi(api, created, {
        name: uniqueName("S permissions alert"),
        queryId: query.id,
        options: { column: "col_name", op: ">", value: 0 },
      })
    ).id;
    destinationName = uniqueName("S permissions destination");
    destinationId = (
      await createDestinationViaApi(api, created, {
        name: destinationName,
        type: "email",
        options: { addresses: "s-permissions@example.com" },
      })
    ).id;
  });

  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
    await userApi?.dispose();
    if (user) {
      await removeUser(api, user.id);
    }
    if (group) {
      await api.delete(`/api/groups/${group.id}`).catch(() => undefined);
    }
  });

  async function openAlertAs(browser: Browser, guard: Guard, baseURL: string | undefined, who: TestUser) {
    const page = await loginAs(browser, guard, baseURL, who);
    await page.goto(`/alerts/${alertId}`);
    await expect(destinationRow(page, destinationName)).toBeVisible();
    return page;
  }

  test("the remove button of a subscription added by an admin is hidden from another user", async ({
    api,
    page,
    browser,
    guard,
    baseURL,
  }) => {
    await subscribe(api, alertId, destinationId);

    await page.goto(`/alerts/${alertId}`);
    await expect(destinationRow(page, destinationName)).toBeVisible();
    await expect(removeButton(page, destinationName)).toHaveCount(1);

    const userPage = await openAlertAs(browser, guard, baseURL, user);
    await expect(removeButton(userPage, destinationName)).toHaveCount(0);
  });

  test("the remove button of a subscription added by a user is shown to that user and to an admin", async ({
    api,
    page,
    browser,
    guard,
    baseURL,
  }) => {
    // Start from no subscription, then let the user subscribe
    const subs: { id: number }[] = await api.get(`/api/alerts/${alertId}/subscriptions`);
    for (const sub of subs) {
      await api.delete(`/api/alerts/${alertId}/subscriptions/${sub.id}`);
    }
    await subscribe(userApi, alertId, destinationId);

    const userPage = await openAlertAs(browser, guard, baseURL, user);
    await expect(removeButton(userPage, destinationName)).toHaveCount(1);

    await page.goto(`/alerts/${alertId}`);
    await expect(destinationRow(page, destinationName)).toBeVisible();
    await expect(removeButton(page, destinationName)).toHaveCount(1);
  });
});
