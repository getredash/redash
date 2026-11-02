import type { Page } from "@playwright/test";
import { INTERNAL } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, dismissToasts, toast } from "../../support/ui";
import { Created, createAlertViaApi, createDestinationViaApi, subscriptions } from "./helpers";

const dialog = (page: Page) => byTest(page, "CreateSourceDialog");
const form = (page: Page) => byTest(page, "Destination");

/** Opens Settings > Alert Destinations and waits until the page has its data. */
async function openDestinations(page: Page) {
  // The "new" dialog copies the list of types when it opens: opened before they arrive, it stays empty
  const types = page.waitForResponse((response) => response.url().endsWith("/api/destinations/types"));
  const list = page.waitForResponse((response) => response.url().endsWith("/api/destinations"));
  await page.goto("/destinations");
  await Promise.all([types, list]);
  await expect(page.locator(".loading-state, .ant-spin-spinning")).toHaveCount(0);
}

/** Creates a destination through the "New Alert Destination" dialog and returns its id. */
async function createDestination(
  page: Page,
  type: string,
  search: string,
  name: string,
  fields: Record<string, string>
) {
  await openDestinations(page);
  await page.getByRole("button", { name: /New Alert Destination/ }).click();
  await byTest(page, "SearchSource").click();
  await page.keyboard.type(search);
  await dialog(page).locator(`[data-test="PreviewItem"][data-test-type="${type}"]`).click();
  await byTest(dialog(page), "Name").fill(name);
  for (const [label, value] of Object.entries(fields)) {
    await byTest(dialog(page), label).fill(value);
  }
  await byTest(page, "CreateSourceSaveButton").click();
  await page.waitForURL(/\/destinations\/\d+$/);
  await expect(toast(page)).toContainText("Saved.");
  await dismissToasts(page);
  return Number(page.url().match(/\/destinations\/(\d+)/)?.[1]);
}

test.describe("Alert destinations", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("an Email destination is created, edited, and keeps its values", async ({ page, api }) => {
    const name = uniqueName("S email destination");
    const address = `${name.replace(/\s+/g, "-").toLowerCase()}@example.com`;
    const id = await createDestination(page, "email", "Email", name, { Addresses: address });
    created.destinations.push(id);
    expect(await api.get(`/api/destinations/${id}`)).toMatchObject({
      name,
      type: "email",
      options: { addresses: address },
    });
    await expect(form(page).locator("h3")).toHaveText("Email");
    await expect(byTest(form(page), "Name")).toHaveValue(name);
    await expect(byTest(form(page), "Addresses")).toHaveValue(address);

    // Add a second address
    await byTest(form(page), "Addresses").click();
    await page.keyboard.press("End");
    await page.keyboard.type(",s-second@example.com");
    await form(page).getByRole("button", { name: "Save" }).click();
    await expect(toast(page)).toContainText("Saved.");

    await page.reload();
    await expect(byTest(form(page), "Addresses")).toHaveValue(`${address},s-second@example.com`);
    expect((await api.get(`/api/destinations/${id}`)).options.addresses).toBe(`${address},s-second@example.com`);

    // It is on the list page
    await openDestinations(page);
    await expect(byTest(page, "CardsList").getByText(name)).toBeVisible();
  });

  test("a Webhook destination is created", async ({ page, api }) => {
    const name = uniqueName("S webhook destination");
    const id = await createDestination(page, "webhook", "Webhook", name, { Url: `${INTERNAL.http}/hook-s-unused` });
    created.destinations.push(id);
    expect(await api.get(`/api/destinations/${id}`)).toMatchObject({ name, type: "webhook" });
    await expect(form(page).locator("h3")).toHaveText("Webhook");
    await expect(byTest(form(page), "Name")).toHaveValue(name);

    const all: { id: number; name: string; type: string }[] = await api.get("/api/destinations");
    expect(all).toContainEqual(expect.objectContaining({ id, name, type: "webhook" }));
  });

  test("the type search filters the list and required fields are validated", async ({ page }) => {
    await openDestinations(page);
    await page.getByRole("button", { name: /New Alert Destination/ }).click();
    const types = dialog(page).locator('[data-test="PreviewItem"]');
    await expect(types.filter({ hasText: "Email" })).toBeVisible();
    await expect(types.filter({ hasText: "Slack" }).first()).toBeVisible();
    await byTest(page, "SearchSource").click();
    const all = await types.count();
    await page.keyboard.type("webhook");
    await expect(types.filter({ hasText: "Email" })).toHaveCount(0);
    expect(await types.count()).toBeLessThan(all);
    for (const text of await types.allInnerTexts()) {
      expect(text).toMatch(/webhook/i);
    }
    await dialog(page).locator('[data-test="PreviewItem"][data-test-type="webhook"]').click();

    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/destinations")) {
        requests.push(request.url());
      }
    });
    await byTest(page, "CreateSourceSaveButton").click();
    await expect(dialog(page).locator(".ant-form-item-explain-error")).toHaveText([
      "This field is required.",
      "This field is required.",
    ]);
    await expect(dialog(page)).toBeVisible();
    expect(requests, "nothing is sent while the form is invalid").toEqual([]);
  });

  test("a destination is deleted after confirmation", async ({ page, api }) => {
    const name = uniqueName("S spare destination");
    const spare = await createDestinationViaApi(api, new Created(), {
      name,
      type: "webhook",
      options: { url: `${INTERNAL.http}/hook-s-spare` },
    });
    created.destinations.push(spare.id); // in case the test fails before deleting it

    await openDestinations(page);
    await byTest(page, "CardsList").getByText(name).click();
    await expect(page).toHaveURL(new RegExp(`/destinations/${spare.id}$`));
    await form(page).getByRole("button", { name: "Delete" }).click();
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Are you sure you want to delete this alert destination?");
    const deleted = page.waitForResponse(
      (response) => response.request().method() === "DELETE" && response.url().endsWith(`/api/destinations/${spare.id}`)
    );
    await confirm.getByRole("button", { name: "Delete" }).click();
    expect((await deleted).status()).toBe(204);
    await expect(toast(page)).toContainText("Alert destination deleted successfully.");
    await expect(page).toHaveURL(/\/destinations$/);
    await expect(page.getByRole("button", { name: /New Alert Destination/ })).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);

    const all: { id: number }[] = await api.get("/api/destinations");
    expect(all.map((destination) => destination.id)).not.toContain(spare.id);
  });

  /** An alert with nobody subscribed, and an Email and a Webhook destination to add to it. */
  async function alertAndDestinations(api: RedashApi, postgresId: number) {
    const { id: queryId } = await createQueryViaApi(api, {
      name: uniqueName("S subscriptions query"),
      dataSourceId: postgresId,
      sql: "select 5 as v",
    });
    created.queries.push(queryId);
    const alert = await createAlertViaApi(api, created, { name: uniqueName("S alert subscriptions"), queryId });
    const email = await createDestinationViaApi(api, created, {
      name: uniqueName("S email destination"),
      type: "email",
      options: { addresses: "s-subscriptions@example.com" },
    });
    const webhook = await createDestinationViaApi(api, created, {
      name: uniqueName("S webhook destination"),
      type: "webhook",
      options: { url: `${INTERNAL.http}/hook-s-subscriptions` },
    });
    return { alert, email, webhook };
  }

  /** Chooses destinations in the alert page's "Add" dialog and saves. */
  async function addDestinations(page: Page, names: string[]) {
    await byTest(page, "ShowAddAlertSubDialog").click();
    const add = page.locator(".ant-modal").filter({ hasText: "Add Existing Alert Destinations" });
    for (const name of names) {
      await add.locator(".destination-wrapper").filter({ hasText: name }).first().click();
    }
    await expect(add.locator(".ant-modal-footer .ant-btn-primary")).toHaveText(`Save (${names.length})`);
    await add.locator(".ant-modal-footer .ant-btn-primary").click();
    await expect(toast(page)).toContainText("Subscribed.");
    await expect(add).toBeHidden();
    await dismissToasts(page);
  }

  test("destinations and the owner's email are added to an alert and removed again", async ({ page, api, seed }) => {
    const { alert, email, webhook } = await alertAndDestinations(api, seed.dataSources.postgres);
    const owner = (await api.get("/api/session")).user.email;
    const panel = byTest(page, "AlertDestinations");
    const toggle = byTest(page, "UserEmailToggle");

    await page.goto(`/alerts/${alert.id}`);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(toggle).not.toHaveClass(/ant-switch-loading/);
    await expect(panel.locator("li")).toHaveText([owner]);

    // One at a time; adding several in one go has its own test below
    await addDestinations(page, [email.name]);
    await expect(panel.locator("li").filter({ hasText: email.name })).toBeVisible();
    await addDestinations(page, [webhook.name]);
    await expect(panel.locator("li").filter({ hasText: webhook.name })).toBeVisible();
    await expect(panel.locator("li")).toHaveCount(3);
    expect(await subscriptions(api, alert.id)).toEqual([email.name, webhook.name].sort());

    // A destination that is already added cannot be chosen again
    await byTest(page, "ShowAddAlertSubDialog").click();
    const add = page.locator(".ant-modal").filter({ hasText: "Add Existing Alert Destinations" });
    const alreadyAdded = add.locator(".select-items-list.disabled").filter({ hasText: email.name });
    await expect(alreadyAdded).toBeVisible();
    await alreadyAdded.click();
    await expect(add.locator(".ant-modal-footer .ant-btn-primary")).toBeDisabled();
    await add.getByRole("button", { name: "Cancel" }).click();
    await expect(add).toBeHidden();

    // The owner's own email is a switch
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => subscriptions(api, alert.id)).toEqual([email.name, webhook.name, `user:${owner}`].sort());

    // Still there after a reload
    await page.reload();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(panel.locator("li")).toHaveCount(3);

    // Remove everything: the x buttons and the switch
    await panel.locator("li").filter({ hasText: email.name }).locator(".remove-button").click();
    await expect(panel.locator("li").filter({ hasText: email.name })).toHaveCount(0);
    await panel.locator("li").filter({ hasText: webhook.name }).locator(".remove-button").click();
    await expect(panel.locator("li").filter({ hasText: webhook.name })).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect.poll(() => subscriptions(api, alert.id)).toEqual([]);
  });

  // A product bug found while writing this suite; it is not in support/known-issues.ts. Both subscriptions are
  // saved, but AlertDestinations.subscribe() appends to `this.state.subs` as read when each response arrives.
  // React 18 batches the two updates, so when the responses arrive close together the second overwrites the
  // first and one destination is missing from the list until the page is reloaded. It happened in roughly one
  // run out of four here, so the test can neither pass reliably nor be marked as an expected failure. Tried:
  // holding both responses with page.route and releasing them together - still only fails every other run.
  test.fixme("two destinations added in one go are both listed", async ({ page, api, seed }) => {
    const { alert, email, webhook } = await alertAndDestinations(api, seed.dataSources.postgres);
    const panel = byTest(page, "AlertDestinations");
    await page.goto(`/alerts/${alert.id}`);
    await expect(byTest(page, "UserEmailToggle")).not.toHaveClass(/ant-switch-loading/);

    await addDestinations(page, [email.name, webhook.name]);
    expect(await subscriptions(api, alert.id), "both are saved").toEqual([email.name, webhook.name].sort());
    await expect(panel.locator("li").filter({ hasText: webhook.name })).toBeVisible();
    await expect(panel.locator("li").filter({ hasText: email.name })).toBeVisible();
  });
});
