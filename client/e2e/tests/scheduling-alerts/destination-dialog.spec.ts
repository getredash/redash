import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest } from "../../support/ui";
import { Created, createDestinationViaApi } from "./helpers";

const dialog = (page: import("@playwright/test").Page) => byTest(page, "CreateSourceDialog");

test.describe("New Alert Destination dialog", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("offers Email and none of the deprecated destination types", async ({ page, api }) => {
    const types: { type: string; deprecated?: boolean }[] = await api.get("/api/destinations/types");
    const deprecated = types.filter((type) => type.deprecated).map((type) => type.type);
    const loaded = page.waitForResponse((response) => response.url().endsWith("/api/destinations/types"));
    await page.goto("/destinations/new");
    await loaded;

    await expect(dialog(page)).toContainText("Email");
    const offered = await dialog(page)
      .locator('[data-test="PreviewItem"]')
      .evaluateAll((items) => items.map((item) => item.getAttribute("data-test-type")));
    expect(offered).toContain("email");
    for (const type of deprecated) {
      expect(offered).not.toContain(type);
    }
    // Everything that is not deprecated is offered
    expect([...offered].sort()).toEqual(
      types
        .filter((type) => !type.deprecated)
        .map((type) => type.type)
        .sort()
    );
  });

  test("shows a custom error message when the destination name is already taken", async ({ page, api }) => {
    const name = uniqueName("S taken destination");
    await createDestinationViaApi(api, created, { name, type: "email", options: { addresses: "s-taken@example.com" } });

    const loaded = page.waitForResponse((response) => response.url().endsWith("/api/destinations/types"));
    await page.goto("/destinations/new");
    await loaded;
    await byTest(page, "SearchSource").fill("Email");
    await dialog(page).locator('[data-test="PreviewItem"][data-test-type="email"]').click();
    await byTest(dialog(page), "Name").fill(name);
    await byTest(dialog(page), "Addresses").fill("s-taken-2@example.com");
    await byTest(page, "CreateSourceSaveButton").click();

    await expect(page.getByText(`Alert Destination with the name ${name} already exists.`)).toBeVisible();
    await expect(dialog(page)).toBeVisible();
  });
});
