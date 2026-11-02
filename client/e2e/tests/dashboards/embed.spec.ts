import type { Page } from "@playwright/test";
import { HTTP_FIXTURE_URL } from "../../support/env";
import { expect, test } from "../../support/fixtures";
import { byTest, retype } from "../../support/ui";
import { applyButton, Created, plotData, type SeededQuery, seedQueries, VIZ } from "./helpers";

const embedDialog = (page: Page) => page.locator(".embed-query-dialog");
const embed = (page: Page) => byTest(page, "VisualizationEmbed");

/** Query page > the visualization's tab > "..." under it > Embed Elsewhere. */
async function openEmbedDialog(page: Page, queryId: number, visualization: string) {
  await page.goto(`/queries/${queryId}`);
  await byTest(page, "QueryPageVisualizationTabs").locator(".ant-tabs-tab").filter({ hasText: visualization }).click();
  await byTest(page, "QueryControlDropdownButton").click();
  await byTest(page, "ShowEmbedDialogButton").click();
  await expect(embedDialog(page).locator(".ant-modal-title")).toHaveText("Embed Query");
  return embedDialog(page);
}

test.describe("Embedding a visualization", () => {
  const created = new Created();
  let byCategory: SeededQuery;
  let divide: SeededQuery;
  let byCustomer: SeededQuery;
  const embedUrl = (baseURL: string | undefined, query: SeededQuery, visualization: number, parameters = "") =>
    `${baseURL}/embed/query/${query.id}/visualization/${visualization}?api_key=${query.api_key}&${parameters}`;

  test.beforeAll(async ({ api, seed }) => {
    byCategory = await seedQueries.byCategory(api, created, seed.dataSources.postgres);
    divide = await seedQueries.divide(api, created, seed.dataSources.postgres);
    byCustomer = await seedQueries.byCustomer(api, created, seed.dataSources.postgres);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  test("Embed Elsewhere shows the public URL and an iframe snippet", async ({ page, baseURL }) => {
    const dialog = await openEmbedDialog(page, byCategory.id, VIZ.bar);
    const url = embedUrl(baseURL, byCategory, byCategory.viz.bar);
    await expect(dialog.locator("h5")).toHaveText(["Public URL", "IFrame Embed"]);
    await expect(dialog.locator("code")).toHaveText([url, `<iframe src="${url}" width="720" height="391"></iframe>`]);

    await dialog.locator(".ant-modal-footer button").click();
    await expect(dialog).toBeHidden();
  });

  test("the URL of a query with a number parameter carries the parameter value", async ({ page, baseURL }) => {
    const dialog = await openEmbedDialog(page, divide.id, VIZ.result);
    await expect(byTest(dialog, "EmbedIframe")).toHaveText(embedUrl(baseURL, divide, divide.viz.result, "p_divisor=4"));
  });

  test("the size checkbox enables the width and height fields, which change the snippet", async ({ page, baseURL }) => {
    const dialog = await openEmbedDialog(page, byCategory.id, VIZ.bar);
    const url = embedUrl(baseURL, byCategory, byCategory.viz.bar);
    const snippet = dialog.locator("code").nth(1);
    const checkbox = dialog.locator(".ant-checkbox-input");
    const [width, height] = [dialog.locator(".size-input input").nth(0), dialog.locator(".size-input input").nth(1)];
    await expect(checkbox).not.toBeChecked();
    await expect(width).toBeDisabled();
    await expect(height).toBeDisabled();
    await expect(width).toHaveValue("720");
    await expect(height).toHaveValue("391");

    await checkbox.check();
    await expect(width).toBeEnabled();
    await expect(height).toBeEnabled();
    await width.click();
    await retype(page, "500");
    await height.click();
    await retype(page, "300");
    await expect(snippet).toHaveText(`<iframe src="${url}" width="500" height="300"></iframe>`);
    // The public URL does not change
    await expect(byTest(dialog, "EmbedIframe")).toHaveText(url);

    await checkbox.uncheck();
    await expect(width).toBeDisabled();
    await expect(snippet).toHaveText(`<iframe src="${url}" width="500" height="300"></iframe>`);
  });

  test("the copy buttons put the URL and the iframe snippet on the clipboard", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const dialog = await openEmbedDialog(page, byCategory.id, VIZ.bar);
    const url = embedUrl(baseURL, byCategory, byCategory.viz.bar);
    const copyButtons = dialog.locator(".code-block button");
    await expect(copyButtons).toHaveCount(2);

    // The clipboard belongs to the whole machine, so a copy by a test running in parallel can replace the text:
    // copy again until our text is what is on it
    const copyAndRead = async (button: number) => {
      await copyButtons.nth(button).click();
      await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toHaveText("Copied!");
      return page.evaluate(() => navigator.clipboard.readText());
    };
    await expect(async () => expect(await copyAndRead(0)).toBe(url)).toPass();
    await expect(async () =>
      expect(await copyAndRead(1)).toBe(`<iframe src="${url}" width="720" height="391"></iframe>`)
    ).toPass();
  });

  test("logged out, the embed URL renders the chart and may be framed by any site", async ({ anonPage, baseURL }) => {
    const failed: string[] = [];
    anonPage.on("response", (response) => {
      if (response.status() >= 400) {
        failed.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    const response = await anonPage.goto(embedUrl(baseURL, byCategory, byCategory.viz.bar));
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-frame-options"]).toBeUndefined();
    expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors *");

    await expect(embed(anonPage)).toContainText(VIZ.bar);
    await expect(embed(anonPage)).toContainText(byCategory.name);
    await expect(embed(anonPage).locator(".js-plotly-plot .point")).toHaveCount(4);
    expect(await plotData(embed(anonPage))).toEqual([
      { x: ["Hardware", "Services", "Software", "Training"], y: [100671, 102848, 86294, 78980] },
    ]);
    await expect(embed(anonPage).getByRole("link", { name: "Open in Redash" })).toBeVisible();
    await expect(embed(anonPage).getByRole("button", { name: /Download Dataset/ })).toBeVisible();
    await expect(anonPage.locator(".desktop-navbar")).toHaveCount(0);
    await expect(anonPage).toHaveURL(/\/embed\/query\//);
    expect(failed, "failed requests of the logged-out embed page").toEqual([]);
  });

  test("logged out, the embed renders inside an iframe on another origin", async ({ anonPage, baseURL }) => {
    const url = embedUrl(baseURL, byCategory, byCategory.viz.bar);
    await anonPage.goto(`${HTTP_FIXTURE_URL}/data.json`);
    expect(new URL(anonPage.url()).origin).not.toBe(new URL(url).origin);
    await anonPage.setContent(
      `<h3>Host page on another origin</h3><iframe id="embedded" src="${url}" width="720" height="391"></iframe>`
    );
    const frame = anonPage.frameLocator("#embedded");
    await expect(frame.locator('[data-test="VisualizationEmbed"]')).toContainText(VIZ.bar);
    await expect(frame.locator(".js-plotly-plot .point")).toHaveCount(4);
    // The chart fits the frame
    const plot = await frame.locator(".js-plotly-plot .main-svg").first().boundingBox();
    expect(plot?.width).toBeGreaterThan(400);
    expect(plot?.width).toBeLessThanOrEqual(720);
  });

  test("logged out, a number parameter takes its default, a value from the URL, and shows the query error", async ({
    anonPage,
    baseURL,
  }) => {
    const counter = embed(anonPage).locator(".counter-visualization-value");
    await anonPage.goto(embedUrl(baseURL, divide, divide.viz.result, "p_divisor=4"));
    await expect(counter).toHaveText("250");

    await anonPage.goto(embedUrl(baseURL, divide, divide.viz.result, "p_divisor=8"));
    await expect(counter).toHaveText("125");
    await expect(byTest(anonPage, "ParameterName-divisor").locator("input")).toHaveValue("8");

    await byTest(anonPage, "ParameterName-divisor").locator("input").click();
    await retype(anonPage, "0");
    await applyButton(anonPage).click();
    await expect(byTest(anonPage, "ErrorMessage")).toHaveText("Error: division by zero");
    await expect(counter).toHaveCount(0);

    await byTest(anonPage, "ParameterName-divisor").locator("input").click();
    await retype(anonPage, "10");
    await applyButton(anonPage).click();
    await expect(counter).toHaveText("100");
    await expect(byTest(anonPage, "ErrorMessage")).toHaveCount(0);
  });

  test("a query with a text parameter cannot be embedded", async ({ page, anonPage, baseURL }) => {
    const dialog = await openEmbedDialog(page, byCustomer.id, "Table");
    await expect(byTest(dialog, "EmbedErrorAlert")).toHaveText(
      "Currently it is not possible to embed queries that contain text parameters."
    );
    await expect(dialog.locator("code")).toHaveCount(0);

    // The address the dialog would have shown does not give the data away either
    const refused: number[] = [];
    anonPage.on("response", (response) => {
      if (/\/api\/queries\/\d+\/results/.test(response.url())) {
        refused.push(response.status());
      }
    });
    await anonPage.goto(embedUrl(baseURL, byCustomer, byCustomer.viz.table, "p_min_qty=1&p_cust=a"));
    await expect(byTest(anonPage, "ErrorMessage")).toContainText("potentially unsafe parameters");
    await expect(embed(anonPage).locator("tbody tr")).toHaveCount(0);
    expect(refused).toEqual([403]);
  });

  test("a wrong api_key sends the visitor to the login page", async ({ anonPage, baseURL }) => {
    const url = embedUrl(baseURL, byCategory, byCategory.viz.bar).replace(/api_key=[^&]+/, "api_key=not-a-real-key");
    await anonPage.goto(url);
    await expect(anonPage).toHaveURL(/\/login\?next=.*embed/);
    await expect(anonPage.locator('input[name="email"]')).toBeVisible();
    await expect(embed(anonPage)).toHaveCount(0);
  });
});
