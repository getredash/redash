import { expect, test, uniqueName } from "../support/fixtures";
import { byTest, createQueryViaApi, toast } from "../support/ui";

/**
 * The organization's default theme applies to everyone without a theme of their own, so it runs with the other
 * organization-wide settings, alone (see playwright.config.ts).
 */
test.describe.configure({ mode: "serial" });

test.describe("Default theme of the organization", () => {
  test.afterEach(async ({ api }) => {
    await api.post("/api/settings/organization", { default_theme: "light" });
  });

  test("set in the general settings, it applies to the app, the login page and public dashboards", async ({
    page,
    anonPage,
    api,
    seed,
  }) => {
    const query = await createQueryViaApi(api, {
      name: uniqueName("X theme dashboard query"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as value",
    });
    const dashboard = await api.post("/api/dashboards", { name: uniqueName("X theme dashboard") });
    await api.post("/api/widgets", {
      dashboard_id: dashboard.id,
      visualization_id: (await api.get(`/api/queries/${query.id}`)).visualizations[0].id,
      text: "",
      width: 1,
      options: { isHidden: false, parameterMappings: {}, position: { col: 0, row: 0, sizeX: 3, sizeY: 4 } },
    });
    await api.post(`/api/dashboards/${dashboard.id}`, { is_draft: false });
    const { public_url: publicUrl } = await api.post(`/api/dashboards/${dashboard.id}/share`);
    const publicPath = new URL(publicUrl).pathname;

    await page.goto("/settings/general");
    await byTest(page, "DefaultThemeSelect").locator(".ant-select-selector").click();
    await page.locator(".ant-select-item-option").filter({ hasText: "Dark" }).click();
    await byTest(page, "OrganizationSettingsSaveButton").click();
    await expect(toast(page)).toContainText("Settings changes saved.");
    // The admin has no theme of their own, so the new default applies right away
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await anonPage.goto(publicPath);
    await expect(byTest(anonPage, "TableVisualization")).toBeVisible();
    await expect(anonPage.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(anonPage.locator("body")).toHaveCSS("background-color", "rgb(15, 19, 24)");

    // The login page, rendered by the server, gets the default too
    await anonPage.goto("/login");
    await expect(anonPage.locator("html")).toHaveAttribute("data-default-theme", "dark");
  });
});
