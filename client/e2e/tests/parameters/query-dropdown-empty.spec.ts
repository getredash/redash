import { expect, test, uniqueName } from "../../support/fixtures";
import { createQueryViaApi } from "../../support/ui";
import { openSource, parameter, valueInput } from "./helpers";

test.describe("Query based dropdown list without values", () => {
  test("a source query that returns no rows gives a dropdown that says 'No options available'", async ({
    page,
    api,
    seed,
  }) => {
    const source = await createQueryViaApi(api, {
      name: uniqueName("P empty source"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select name, id as value from cities where false",
    });
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P empty dropdown"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select '{{ test_parameter }}' as parameter",
      options: {
        parameters: [parameter({ name: "test_parameter", title: "Test Parameter", type: "query", queryId: source.id })],
      },
      run: false,
    });
    await openSource(page, id);

    const select = valueInput(page, "test_parameter").locator(".ant-select:not(.ant-select-disabled)");
    await select.locator(".ant-select-selector").click();
    await expect(
      page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-empty")
    ).toHaveText("No options available");
  });
});
