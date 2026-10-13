import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { backendUpgradeIssue } from "../../support/known-issues";
import { createQueryViaApi } from "../../support/ui";
import { headerMenu, openQuerySource, parseDelimited } from "./helpers";

const dialog = (page: Page) => page.locator(".query-api-key-dialog-wrapper");
const keyInput = (page: Page) => dialog(page).getByLabel("Query API Key");
const exampleUrls = (page: Page) => dialog(page).locator("code");

test.describe("Query API key", () => {
  const name = uniqueName("Q api key");
  let queryId: number;
  // A client without the browser's session: only the key in the URL identifies it
  let anonymous: APIRequestContext;

  test.beforeAll(async ({ api, seed, playwright, baseURL }) => {
    queryId = (
      await createQueryViaApi(api, {
        name,
        dataSourceId: seed.dataSources.postgres,
        sql: "select id, name, country, lat from cities order by id",
      })
    ).id;
    anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  });

  test.afterAll(async () => {
    await anonymous.dispose();
  });

  const results = (format: string, key?: string) =>
    anonymous.get(`/api/queries/${queryId}/results.${format}`, { params: key ? { api_key: key } : undefined });

  test("the dialog shows the key and example URLs that work without a login; Regenerate replaces the key", async ({
    page,
    context,
    api,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openQuerySource(page, queryId);
    await headerMenu(page, "Show API Key");
    await expect(dialog(page)).toBeVisible();
    const key = await keyInput(page).inputValue();
    expect(key).toMatch(/^\w{40}$/);
    expect(key).toBe((await api.get(`/api/queries/${queryId}`)).api_key);
    await expect(exampleUrls(page)).toHaveText([
      `${baseURL}/api/queries/${queryId}/results.csv?api_key=${key}`,
      `${baseURL}/api/queries/${queryId}/results.json?api_key=${key}`,
    ]);

    // The copy button next to the first URL
    // The clipboard belongs to the whole machine, so a copy by a test running in parallel can replace the text:
    // copy again until our text is what is on it
    await expect(async () => {
      await dialog(page).locator(".code-block button").first().click();
      await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toContainText("Copied!");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        `${baseURL}/api/queries/${queryId}/results.csv?api_key=${key}`
      );
    }).toPass();

    // The key gives access to the results, and only the key does
    const json = await results("json", key);
    expect(json.status()).toBe(200);
    const rows = (await json.json()).query_result.data.rows;
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ id: 1, name: "Tel Aviv", country: "Israel", lat: 32.08 });
    const csv = await results("csv", key);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const lines = parseDelimited(await csv.text(), ",");
    expect(lines).toHaveLength(13);
    expect(lines[0]).toEqual(["id", "name", "country", "lat"]);
    expect(lines[1]).toEqual(["1", "Tel Aviv", "Israel", "32.08"]);

    for (const response of [await results("json"), await results("json", "notTheKey123")]) {
      expect(response.status()).toBe(404);
      expect((await response.json()).message).toBe("Couldn't find resource. Please login and try again.");
    }

    // Regenerate: a new key in the dialog and in the example URLs
    const regenerated = page.waitForResponse((response) => /regenerate_api_key/.test(response.url()));
    await dialog(page).getByRole("button", { name: "Regenerate" }).click();
    await regenerated;
    await expect(keyInput(page)).not.toHaveValue(key);
    const newKey = await keyInput(page).inputValue();
    expect(newKey).toMatch(/^\w{40}$/);
    await expect(exampleUrls(page)).toHaveText([
      `${baseURL}/api/queries/${queryId}/results.csv?api_key=${newKey}`,
      `${baseURL}/api/queries/${queryId}/results.json?api_key=${newKey}`,
    ]);
    expect((await api.get(`/api/queries/${queryId}`)).api_key).toBe(newKey);

    // The old key stops working, the new one works
    expect((await results("json", key)).status()).toBe(404);
    expect((await results("csv", key)).status()).toBe(404);
    expect((await results("json", newKey)).status()).toBe(200);
    expect((await results("csv", newKey)).status()).toBe(200);
    expect((await (await results("json", newKey)).json()).query_result.data.rows).toHaveLength(12);

    // Reopening the dialog shows the new key
    await page.locator(".ant-modal-footer button").filter({ hasText: "Close" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await headerMenu(page, "Show API Key");
    await expect(keyInput(page)).toHaveValue(newKey);
  });

  test("results fetched with the key are served under the query's file name", async ({ api }) => {
    backendUpgradeIssue("download-file-name-bytes");
    const key = (await api.get(`/api/queries/${queryId}`)).api_key;
    const file = name.replace(/ /g, "_");
    for (const format of ["csv", "xlsx"]) {
      const response = await results(format, key);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-disposition"]).toMatch(
        new RegExp(`^attachment; filename="?${file}_\\d{4}_\\d{2}_\\d{2}\\.${format}"?$`)
      );
    }
  });
});
