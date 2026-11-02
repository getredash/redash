import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../support/fixtures";
import { byTest, createQueryViaApi, createVisualizationViaApi, dismissToasts, toast } from "../support/ui";

/**
 * Settings of the whole organization that other tests depend on: with public URLs disabled every sharing and
 * embedding test fails, and the thousands separator changes every formatted number. So these tests are in a
 * project of their own that runs alone, after the other tests have finished (see playwright.config.ts).
 */
test.describe.configure({ mode: "serial" });

const table = (page: Page) => byTest(page, "TableVisualization");

test.describe("Disable public URLs", () => {
  test.afterEach(async ({ api }) => {
    await api.post("/api/settings/organization", { disable_public_urls: false });
  });

  test("a shared dashboard cannot be shared any more and its public address stops working", async ({
    page,
    anonPage,
    api,
    seed,
  }) => {
    const query = await createQueryViaApi(api, {
      name: uniqueName("X public urls dashboard query"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 'visible to the public' as message",
    });
    const tableId = (await api.get(`/api/queries/${query.id}`)).visualizations[0].id;
    const dashboard = await api.post("/api/dashboards", { name: uniqueName("X public urls dashboard") });
    await api.post("/api/widgets", {
      dashboard_id: dashboard.id,
      visualization_id: tableId,
      text: "",
      width: 1,
      options: { isHidden: false, parameterMappings: {}, position: { col: 0, row: 0, sizeX: 6, sizeY: 6 } },
    });
    await api.post(`/api/dashboards/${dashboard.id}`, { is_draft: false });
    const { public_url: publicUrl } = await api.post(`/api/dashboards/${dashboard.id}/share`);
    const publicPath = new URL(publicUrl).pathname;

    try {
      await page.goto(`/dashboards/${dashboard.id}`);
      await expect(byTest(page, "OpenShareForm")).toBeVisible();
      await anonPage.goto(publicPath);
      await expect(table(anonPage)).toContainText("visible to the public");

      await api.post("/api/settings/organization", { disable_public_urls: true });

      await page.reload();
      await expect(byTest(page, "DashboardMoreButton")).toBeVisible();
      await expect(table(page)).toContainText("visible to the public");
      await expect(byTest(page, "OpenShareForm")).toHaveCount(0);

      // The page loads and renders none of the content
      await anonPage.goto(publicPath, { waitUntil: "networkidle" });
      await expect(table(anonPage)).toHaveCount(0);
      await expect(anonPage.getByText("visible to the public")).toHaveCount(0);

      // Enabled again, the same address works again
      await api.post("/api/settings/organization", { disable_public_urls: false });
      await anonPage.goto(publicPath);
      await expect(table(anonPage)).toContainText("visible to the public");
    } finally {
      await api.delete(`/api/dashboards/${dashboard.id}`).catch(() => undefined);
      await api.delete(`/api/queries/${query.id}`).catch(() => undefined);
    }
  });

  test("a query offers neither the embed dialog nor its API key, and its embed address stops working", async ({
    page,
    anonPage,
    api,
    seed,
  }) => {
    const query = await createQueryViaApi(api, {
      name: uniqueName("X public urls embed query"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 'embedded for the public' as message",
    });
    const tableId = (await api.get(`/api/queries/${query.id}`)).visualizations[0].id;
    const embedPath = `/embed/query/${query.id}/visualization/${tableId}?api_key=${query.api_key}`;
    const openMenu = page.locator(".ant-dropdown:not(.ant-dropdown-hidden)");

    try {
      await page.goto(`/queries/${query.id}/source`);
      await expect(table(page)).toContainText("embedded for the public");
      await byTest(page, "QueryControlDropdownButton").click();
      await expect(byTest(page, "ShowEmbedDialogButton")).toBeVisible();
      await page.keyboard.press("Escape");
      await byTest(page, "QueryPageHeaderMoreButton").click();
      await expect(openMenu.getByText("Show API Key")).toBeVisible();
      await anonPage.goto(embedPath);
      await expect(table(anonPage)).toContainText("embedded for the public");

      await api.post("/api/settings/organization", { disable_public_urls: true });

      await page.reload();
      await expect(table(page)).toContainText("embedded for the public");
      await byTest(page, "QueryPageHeaderMoreButton").click();
      await expect(openMenu.locator(".ant-dropdown-menu-item").first()).toBeVisible();
      await expect(openMenu.getByText("Show API Key")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await byTest(page, "QueryControlDropdownButton").click();
      await expect(openMenu.locator(".ant-dropdown-menu-item").first()).toBeVisible();
      await expect(byTest(page, "ShowEmbedDialogButton")).toHaveCount(0);

      // The page loads and renders none of the content
      await anonPage.goto(embedPath, { waitUntil: "networkidle" });
      await expect(table(anonPage)).toHaveCount(0);
      await expect(anonPage.getByText("embedded for the public")).toHaveCount(0);
    } finally {
      await api.delete(`/api/queries/${query.id}`).catch(() => undefined);
    }
  });
});

test.describe("Number format", () => {
  test("a thousands separator typed in the settings is saved and groups the integers of a result", async ({
    page,
    api,
    seed,
  }) => {
    const settings = async () => (await api.get("/api/settings/organization")).settings;
    const before = await settings();
    const query = await createQueryViaApi(api, {
      name: uniqueName("X thousands separator query"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1234567 as n",
    });
    // A counter formats its number itself and must not follow the setting for tables
    const counterId = await createVisualizationViaApi(api, query.id, {
      type: "COUNTER",
      name: "X counter",
      options: { counterColName: "n", rowNumber: 1, stringThousandSeparator: "," },
    });

    try {
      await page.goto("/settings/general");
      const input = byTest(page, "ThousandsSeparatorInput");
      await expect(input).toBeVisible();
      await input.fill(" ");
      await byTest(page, "OrganizationSettingsSaveButton").click();
      await expect(toast(page)).toContainText("Settings changes saved.");
      await dismissToasts(page);

      await page.reload();
      await expect(byTest(page, "ThousandsSeparatorInput")).toHaveValue(" ");

      await page.goto(`/queries/${query.id}`);
      await expect(table(page).locator("tbody tr.ant-table-row td").first()).toHaveText("1 234 567");
      await page.goto(`/queries/${query.id}#${counterId}`);
      await expect(page.locator(".counter-visualization-value")).toHaveText("1,234,567");
    } finally {
      await api.post("/api/settings/organization", { thousands_separator: before.thousands_separator });
      await api.delete(`/api/queries/${query.id}`).catch(() => undefined);
    }
    expect((await settings()).thousands_separator).toBe(before.thousands_separator);

    await page.goto(`/queries/${query.id}`);
    await expect(page.getByText("1 234 567")).toHaveCount(0);
  });
});
