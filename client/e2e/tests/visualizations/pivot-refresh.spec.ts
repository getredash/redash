import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createVisualizationViaApi, setSql } from "../../support/ui";
import { SLOW_INSTANCE_TIMEOUT, seedQuery, tabs } from "./helpers";

test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

const SQL = `SELECT 'a' AS stage1, 'a1' AS stage2, 11 AS value UNION ALL
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

test.describe("Pivot visualization", () => {
  test("a saved pivot shows the new data after the query text is changed and executed again", async ({
    page,
    api,
    seed,
  }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V pivot refresh"), SQL);
    const id = await createVisualizationViaApi(api, queryId, {
      type: "PIVOT",
      name: "Pivot",
      options: {
        aggregatorName: "Count",
        data: [], // an options object may carry a data property although it should not
        controls: { enabled: false },
        cols: ["stage1"],
        rows: ["stage2"],
        vals: ["value"],
      },
    });
    await page.goto(`/queries/${queryId}/source#${id}`);
    await expect(tabs(page)).toBeVisible({ timeout: 30_000 });

    // The grand total of a count is the number of rows
    const grandTotal = byTest(page, "PivotTableVisualization").first().locator(".pvtGrandTotal");
    await expect(grandTotal).toHaveText("11");

    await setSql(page, `${SQL} UNION ALL\nSELECT 'c' AS stage1, 'c5' AS stage2, 55 AS value`);
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === `/api/queries/${queryId}`
    );
    await byTest(page, "SaveButton").click();
    await saved;
    await page.locator('.query-editor-controls [data-test="ExecuteButton"]').click();

    await expect(grandTotal).toHaveText("12");
    expect((await api.get(`/api/queries/${queryId}`)).query).toContain("c5");
  });
});
