import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, selectOptions } from "../../support/ui";
import {
  allowMultiple,
  apply,
  choose,
  dialog,
  dialogHelp,
  expectPending,
  expectRows,
  field,
  openDropdown,
  openSource,
  parameter,
  savedParameters,
  setType,
  tags,
  typeDropdownValues,
  typeValue,
  valueInput,
} from "./helpers";

const CATEGORIES = ["Hardware", "Software", "Services", "Training"];

/** A saved query whose parameters are all plain text parameters without a value, as typing the SQL leaves them. */
async function queryWithTextParameters(api: RedashApi, dataSourceId: number, sql: string, names: string[]) {
  const { id } = await createQueryViaApi(api, {
    name: uniqueName("P types"),
    dataSourceId,
    sql,
    options: { parameters: names.map((name) => parameter({ name })) },
    run: false,
  });
  return id;
}

test.describe("Parameter types: text, number and dropdown lists", () => {
  test("Text: the typed value reaches the query, also with spaces and non-ASCII characters", async ({
    page,
    api,
    seed,
  }) => {
    const id = await queryWithTextParameters(api, seed.dataSources.postgres, "select '{{ txt }}' as txt", ["txt"]);
    await openSource(page, id);

    await typeValue(page, "txt", "Tel Aviv");
    await apply(page);
    await expectRows(page, [{ txt: "Tel Aviv" }]);

    await typeValue(page, "txt", "héllo wörld ✓");
    await apply(page);
    await expectRows(page, [{ txt: "héllo wörld ✓" }]);
  });

  test("Number: decimals and negative numbers reach the query as numbers", async ({ page, api, seed }) => {
    const id = await queryWithTextParameters(api, seed.dataSources.postgres, "select {{ num }} * 2 as dbl", ["num"]);
    await openSource(page, id);
    await setType(page, "num", "Number");
    await expect(valueInput(page, "num").locator(".ant-input-number")).toBeVisible();

    await typeValue(page, "num", "2.5");
    await apply(page);
    await expectRows(page, [{ dbl: "5.00" }]);

    await typeValue(page, "num", "-3");
    await apply(page);
    await expectRows(page, [{ dbl: "-6" }]);
    await expect.poll(async () => (await savedParameters(api, id))[0].type).toBe("number");
  });

  test("Dropdown List: the values typed in the dialog are offered and the chosen one reaches the query", async ({
    page,
    api,
    seed,
  }) => {
    const id = await queryWithTextParameters(api, seed.dataSources.postgres, "select '{{ cat }}' as cat", ["cat"]);
    await openSource(page, id);
    await setType(page, "cat", "Dropdown List", async () => {
      await expect(dialogHelp(page)).toHaveText("Dropdown list values (newline delimited)");
      await typeDropdownValues(page, CATEGORIES);
    });

    await openDropdown(page, "cat");
    await expect(selectOptions(page)).toHaveText(CATEGORIES);
    await selectOptions(page).filter({ hasText: "Services" }).click();
    await expect(valueInput(page, "cat").locator(".ant-select-selection-item")).toHaveText("Services");
    await apply(page);
    await expectRows(page, [{ cat: "Services" }]);

    await choose(page, "cat", "Training");
    await apply(page);
    await expectRows(page, [{ cat: "Training" }]);

    await expect
      .poll(async () => (await savedParameters(api, id))[0])
      .toMatchObject({ type: "enum", enumOptions: CATEGORIES.join("\n") });
  });

  test("Multiple values without quotation are placed in the query as a bare list; a tag can be removed with its x", async ({
    page,
    api,
    seed,
  }) => {
    const sql =
      "select string_agg(distinct quantity::text, ',' order by quantity::text) as quantities from orders where quantity in ({{ qty }})";
    const id = await queryWithTextParameters(api, seed.dataSources.postgres, sql, ["qty"]);
    await openSource(page, id);
    await setType(page, "qty", "Dropdown List", async () => {
      await typeDropdownValues(page, ["1", "2", "3", "4", "5"]);
      await allowMultiple(page);
      await expect(byTest(dialog(page), "QuotationSelect").locator(".ant-select-selection-item")).toHaveText(
        "None (default)"
      );
      await expect(dialogHelp(page).last()).toHaveText("Placed in query as: value1,value2,value3");
      await byTest(dialog(page), "QuotationSelect").locator(".ant-select-selector").click();
      await expect(selectOptions(page)).toHaveText([
        "None (default)",
        "Single Quotation Mark",
        "Double Quotation Mark",
      ]);
      await page.keyboard.press("Escape");
    });

    await choose(page, "qty", "1", "3");
    await expect(tags(page, "qty")).toHaveText(["1", "3"]);
    await expectPending(page, 1);
    await apply(page);
    await expectRows(page, [{ quantities: "1,3" }]);

    await tags(page, "qty").filter({ hasText: "1" }).locator(".ant-select-selection-item-remove").click();
    await expect(tags(page, "qty")).toHaveText(["3"]);
    await apply(page);
    await expectRows(page, [{ quantities: "3" }]);

    await expect
      .poll(async () => (await savedParameters(api, id))[0].multiValuesOptions)
      .toEqual({ prefix: "", suffix: "", separator: "," });
  });

  test("Multiple values with single quotes are placed as quoted strings; more than three show as '+N more'", async ({
    page,
    api,
    seed,
  }) => {
    const sql =
      "select string_agg(distinct category, ',' order by category) as categories from orders where category in ({{ cats }})";
    const id = await queryWithTextParameters(api, seed.dataSources.postgres, sql, ["cats"]);
    await openSource(page, id);
    await setType(page, "cats", "Dropdown List", async () => {
      await typeDropdownValues(page, CATEGORIES);
      await allowMultiple(page, "Single Quotation Mark");
      await expect(dialogHelp(page).last()).toHaveText("Placed in query as: 'value1','value2','value3'");
    });

    await choose(page, "cats", "Hardware", "Training");
    await apply(page);
    await expectRows(page, [{ categories: "Hardware,Training" }]);

    await choose(page, "cats", "Software", "Services");
    await expect(tags(page, "cats")).toHaveText(["Hardware", "Training", "Software", "+1 more"]);
    await apply(page);
    await expectRows(page, [{ categories: "Hardware,Services,Software,Training" }]);

    await expect
      .poll(async () => (await savedParameters(api, id))[0].multiValuesOptions)
      .toEqual({ prefix: "'", suffix: "'", separator: "," });
  });

  test("Multiple values with double quotes can be used as column names", async ({ page, api, seed }) => {
    const id = await queryWithTextParameters(
      api,
      seed.dataSources.postgres,
      "select {{ cols }} from cities order by id limit 2",
      ["cols"]
    );
    await openSource(page, id);
    await setType(page, "cols", "Dropdown List", async () => {
      await typeDropdownValues(page, ["id", "name", "country", "lat"]);
      await allowMultiple(page, "Double Quotation Mark");
      await expect(dialogHelp(page).last()).toHaveText('Placed in query as: "value1","value2","value3"');
    });

    await choose(page, "cols", "name", "country");
    await apply(page);
    // Exactly the two chosen columns, in the order they were chosen
    await expectRows(page, [
      { name: "Tel Aviv", country: "Israel" },
      { name: "Berlin", country: "Germany" },
    ]);
    await expect(field(page, "cols")).toHaveCount(0);
  });
});
