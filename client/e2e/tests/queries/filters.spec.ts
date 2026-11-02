import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, pick, selectOptions } from "../../support/ui";
import { resultRows } from "./helpers";

const SQL = `
SELECT 'a' AS stage1, 'a1' AS stage2, 11 AS value UNION ALL
SELECT 'a' AS stage1, 'a2' AS stage2, 12 AS value UNION ALL
SELECT 'a' AS stage1, 'a3' AS stage2, 45 AS value UNION ALL
SELECT 'a' AS stage1, 'a4' AS stage2, 54 AS value UNION ALL
SELECT 'b' AS stage1, 'b1' AS stage2, 33 AS value UNION ALL
SELECT 'b' AS stage1, 'b2' AS stage2, 73 AS value UNION ALL
SELECT 'b' AS stage1, 'b3' AS stage2, 90 AS value UNION ALL
SELECT 'c' AS stage1, 'c1' AS stage2, 19 AS value UNION ALL
SELECT 'c' AS stage1, 'c2' AS stage2, 92 AS value UNION ALL
SELECT 'c' AS stage1, 'c3' AS stage2, 63 AS value UNION ALL
SELECT 'c' AS stage1, 'c4' AS stage2, 44 AS value`;

/** The values of the first column of the result table. */
async function firstColumn(page: Page): Promise<string[]> {
  return (await resultRows(page)).map((row) => row[0]);
}

test.describe("Query filters", () => {
  test("a filter column gives a single-value filter that starts on the first value and filters the table", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("Q filter"),
      dataSourceId: seed.dataSources.postgres,
      sql: `SELECT stage1 AS "stage1::filter", stage2, value FROM (${SQL}) q`,
    });
    await page.goto(`/queries/${id}`);
    const filter = byTest(page, "FilterName-stage1::filter");
    await expect(filter.locator(".ant-select-selection-item")).toHaveText("a");
    await expect.poll(() => firstColumn(page)).toEqual(["a", "a", "a", "a"]);

    await pick(page, filter, /^b$/);
    await expect(filter.locator(".ant-select-selection-item")).toHaveText("b");
    await expect.poll(() => firstColumn(page)).toEqual(["b", "b", "b"]);
  });

  test("a multi-filter column starts with every value selected; Clear, one value, two values and Select All filter the table", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("Q multi-filter"),
      dataSourceId: seed.dataSources.postgres,
      sql: `SELECT stage1 AS "stage1::multi-filter", stage2, value FROM (${SQL}) q`,
    });
    await page.goto(`/queries/${id}`);
    const filter = byTest(page, "FilterName-stage1::multi-filter");
    const selected = filter.locator(".ant-select-selection-item-content");
    const ALL = ["a", "a", "a", "a", "b", "b", "b", "c", "c", "c", "c"];

    async function openDropdown() {
      await filter.locator(".ant-select-selector").click();
      await expect(selectOptions(page).first()).toBeVisible();
    }
    async function closeDropdown() {
      await page.keyboard.press("Escape");
      await expect(selectOptions(page)).toHaveCount(0);
    }
    const dropdownItem = (name: string) =>
      page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) [data-test="${name}"]`);

    // Every value is selected at first
    await expect(selected).toHaveText(["a", "b", "c"]);
    await expect.poll(() => firstColumn(page)).toEqual(ALL);

    // Clear: nothing is selected and there is no table
    await openDropdown();
    await dropdownItem("ClearOption").click();
    await closeDropdown();
    await expect(selected).toHaveCount(0);
    await expect(byTest(page, "TableVisualization")).toHaveCount(0);

    // One value
    await openDropdown();
    await selectOptions(page).filter({ hasText: /^a$/ }).click();
    await closeDropdown();
    await expect(selected).toHaveText(["a"]);
    await expect.poll(() => firstColumn(page)).toEqual(["a", "a", "a", "a"]);

    // Two values
    await openDropdown();
    await selectOptions(page).filter({ hasText: /^b$/ }).click();
    await closeDropdown();
    await expect(selected).toHaveText(["a", "b"]);
    await expect.poll(() => firstColumn(page)).toEqual(["a", "a", "a", "a", "b", "b", "b"]);

    // Select All
    await openDropdown();
    await dropdownItem("SelectAllOption").click();
    await closeDropdown();
    await expect(selected).toHaveText(["a", "b", "c"]);
    await expect.poll(() => firstColumn(page)).toEqual(ALL);
  });
});
