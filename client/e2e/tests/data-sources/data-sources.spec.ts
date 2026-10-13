import type { Page } from "@playwright/test";
import { INTERNAL } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, dismissToasts, toast } from "../../support/ui";

const dialog = (page: Page) => byTest(page, "CreateSourceDialog");

/** Creates a data source through the "New Data Source" dialog and returns its id. */
async function createDataSource(
  page: Page,
  type: string,
  search: string,
  name: string,
  fields: Record<string, string>
) {
  await page.goto("/data_sources");
  // The dialog gets the list of types when it opens, and the page loads them after it has rendered the button
  await expect(byTest(page, "CardsList")).toBeVisible();
  await page.getByRole("button", { name: /New Data Source/ }).click();
  await expect(byTest(page, "SearchSource")).toBeFocused();
  await byTest(page, "SearchSource").fill(search);
  await expect(byTest(page, "SearchSource")).toHaveValue(search);
  await dialog(page).locator(`[data-test="PreviewItem"][data-test-type="${type}"]`).click();
  await byTest(dialog(page), "Name").fill(name);
  for (const [label, value] of Object.entries(fields)) {
    await byTest(dialog(page), label).fill(value);
  }
  await byTest(page, "CreateSourceSaveButton").click();
  await page.waitForURL(/\/data_sources\/\d+$/);
  await expect(toast(page)).toContainText("Saved.");
  await dismissToasts(page);
  return Number(page.url().match(/\/data_sources\/(\d+)/)?.[1]);
}

async function testConnection(page: Page) {
  await page.getByRole("button", { name: "Test Connection" }).click();
  return toast(page);
}

test.describe("Data sources", () => {
  // Data sources created here are deleted again, so list pages elsewhere are not affected for long
  const created: number[] = [];
  test.afterAll(async ({ api }) => {
    for (const id of created) {
      await api.delete(`/api/data_sources/${id}`).catch(() => undefined);
    }
  });

  test("the New Data Source dialog focuses its search box and filters the types", async ({ page }) => {
    await page.goto("/data_sources");
    await expect(byTest(page, "CardsList")).toBeVisible();
    await page.getByRole("button", { name: /New Data Source/ }).click();
    await expect(byTest(page, "SearchSource")).toBeFocused();
    await page.keyboard.type("postgres");
    const types = await dialog(page)
      .locator('[data-test="PreviewItem"]')
      .evaluateAll((items) => items.map((item) => item.getAttribute("data-test-type")));
    expect(types).toEqual(["pg"]);
  });

  test("PostgreSQL: create and test the connection", async ({ page }) => {
    const { host, user, password, db } = INTERNAL.postgres;
    const id = await createDataSource(page, "pg", "postgres", uniqueName("DS PostgreSQL"), {
      Host: host,
      User: user,
      Password: password,
      "Database Name": db,
    });
    created.push(id);
    await expect(await testConnection(page)).toContainText("Success");
  });

  test("MySQL: create, test, break the password, fix and rename", async ({ page, seed, api }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    const { host, user, password, db } = INTERNAL.mysql;
    const name = uniqueName("DS MySQL");
    const id = await createDataSource(page, "mysql", "mysql", name, {
      Host: host,
      User: user,
      Password: password,
      "Database name": db,
    });
    created.push(id);
    await expect(await testConnection(page)).toContainText("Success");
    await dismissToasts(page);

    await byTest(page, "Password").fill("wrong-password");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page)).toContainText("Saved.");
    await dismissToasts(page);
    await expect(await testConnection(page)).toContainText(/Connection Test Failed:.*Access denied/s);
    await dismissToasts(page);

    await byTest(page, "Password").fill(password);
    await byTest(page, "Name").fill(`${name} renamed`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page)).toContainText("Saved.");
    await dismissToasts(page);
    await expect(await testConnection(page)).toContainText("Success");

    await page.reload();
    await expect(byTest(page, "Name")).toHaveValue(`${name} renamed`);
    // The saved password is never sent back to the browser
    await expect(byTest(page, "Password")).toHaveValue("--------");
    expect((await api.get(`/api/data_sources/${id}`)).name).toBe(`${name} renamed`);
  });

  for (const source of [
    { type: "results", search: "query results", label: "Query Results" },
    { type: "json", search: "json", label: "JSON" },
    { type: "csv", search: "csv", label: "CSV" },
  ]) {
    test(`${source.label}: create and test the connection`, async ({ page }) => {
      created.push(await createDataSource(page, source.type, source.search, uniqueName(`DS ${source.label}`), {}));
      await expect(await testConnection(page)).toContainText("Success");
    });
  }

  test("a data source can be deleted after confirmation", async ({ page }) => {
    const name = uniqueName("DS SQLite");
    await createDataSource(page, "sqlite", "sqlite", name, { "Database Path": "/tmp/e2e-scratch.db" });
    await page.getByRole("button", { name: "Delete" }).click();
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Are you sure you want to delete this data source?");
    await confirm.locator(".ant-btn-dangerous, .ant-btn-danger, .ant-btn-primary").first().click();
    await expect(page).toHaveURL(/\/data_sources$/);
    await expect(byTest(page, "CardsList")).toBeVisible();
    await expect(byTest(page, "CardsList").getByText(name)).toHaveCount(0);
  });
});
