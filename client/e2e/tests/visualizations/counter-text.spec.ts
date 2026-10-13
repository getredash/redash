import { expect, test, uniqueName } from "../../support/fixtures";
import {
  choose,
  newVisualization,
  openSourcePage,
  openViewPage,
  preview,
  savedVisualization,
  saveVisualization,
  seedQuery,
  SLOW_INSTANCE_TIMEOUT,
  typeIn,
} from "./helpers";

test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

const SQL = `SELECT 27182.8182846 AS a, 20000 AS b, 'lorem' AS c UNION ALL
SELECT 31415.9265359 AS a, 40000 AS b, 'ipsum' AS c`;

test.describe("Counter visualization with text", () => {
  test("a text value and a text target are shown as they are, without a trend", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V counter text"), SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "COUNTER", "Counter text");
    const container = (scope = preview(page)) => scope.locator(".counter-visualization-container").first();
    const value = (scope = preview(page)) => container(scope).locator(".counter-visualization-value");
    const target = (scope = preview(page)) => container(scope).locator(".counter-visualization-target");

    await choose(page, "Counter.General.ValueColumn", "Counter.General.ValueColumn.c");
    await expect(value()).toHaveText("lorem");
    await choose(page, "Counter.General.TargetValueColumn", "Counter.General.TargetValueColumn.c");
    // The target is taken from the first row too, until the row number says otherwise
    await expect(target()).toHaveText("(lorem)");
    await typeIn(page, "Counter.General.TargetValueRowNumber", "2");
    await expect(value()).toHaveText("lorem");
    await expect(target()).toHaveText("(ipsum)");
    // Two texts cannot be compared: no trend either way
    await expect(container()).not.toHaveClass(/trend-/);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      counterColName: "c",
      targetColName: "c",
      targetRowNumber: 2,
    });

    await openViewPage(page, queryId, saved.id);
    await expect(value(page.locator("body"))).toHaveText("lorem");
    await expect(target(page.locator("body"))).toHaveText("(ipsum)");
    await expect(container(page.locator("body"))).not.toHaveClass(/trend-/);
  });
});
