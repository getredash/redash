import type { Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { byTest } from "../../support/ui";

const dialog = (page: Page) => byTest(page, "CreateSourceDialog");

test.describe("New Data Source dialog", () => {
  test("opens from the button, and from the link in the empty list, and closes with Cancel", async ({ page }) => {
    // The instance always has data sources: show the empty state, which is where the link is
    await page.route(
      (url) => url.pathname === "/api/data_sources",
      (route) => (route.request().method() === "GET" ? route.fulfill({ json: [] }) : route.continue())
    );
    // The dialog copies the list of types when it opens: opened before they arrive, it is empty
    const types = page.waitForResponse((response) => response.url().endsWith("/api/data_sources/types"));
    await page.goto("/data_sources");
    await types;
    await expect(page.getByText("There are no data sources yet.")).toBeVisible();

    for (const trigger of ["CreateDataSourceButton", "CreateDataSourceLink"]) {
      await byTest(page, trigger).click();
      await expect(dialog(page)).toBeVisible();
      await expect(dialog(page).locator('[data-test="PreviewItem"]').first()).toBeVisible();
      await byTest(page, "CreateSourceCancelButton").click();
      await expect(dialog(page)).toHaveCount(0);
    }
  });

  test("offers PostgreSQL and none of the deprecated data source types", async ({ page, api }) => {
    const types: { type: string; deprecated?: boolean }[] = await api.get("/api/data_sources/types");
    const deprecated = types.filter((type) => type.deprecated).map((type) => type.type);
    const loaded = page.waitForResponse((response) => response.url().endsWith("/api/data_sources/types"));
    await page.goto("/data_sources/new");
    await loaded;

    await expect(dialog(page)).toContainText("PostgreSQL");
    const offered = await dialog(page)
      .locator('[data-test="PreviewItem"]')
      .evaluateAll((items) => items.map((item) => item.getAttribute("data-test-type")));
    expect(offered).toContain("pg");
    for (const type of deprecated) {
      expect(offered).not.toContain(type);
    }
  });
});
