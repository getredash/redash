import { MOD } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, selectOptions } from "../../support/ui";
import {
  allowMultiple,
  apply,
  choose,
  chooseType,
  confirmSettings,
  dialog,
  expectPending,
  expectRows,
  openDropdown,
  openSettings,
  openSource,
  option,
  parameter,
  saveQuery,
  savedParameters,
  tags,
  valueInput,
} from "./helpers";

const CITY_NAMES = [
  "Austin",
  "Berlin",
  "Lisbon",
  "London",
  "Mumbai",
  "Nairobi",
  "Paris",
  "Sao Paulo",
  "Sydney",
  "Tel Aviv",
  "Tokyo",
  "Toronto",
];

/** Published, executed queries to take dropdown values from. */
async function createSources(api: RedashApi, dataSourceId: number) {
  const create = (label: string, sql: string) =>
    createQueryViaApi(api, { name: uniqueName(`P source ${label}`), dataSourceId, sql }).then(({ id }) => id);
  return {
    // name/value columns: the name is shown, the value is placed in the query
    cities: await create("cities", "select name, id as value, country from cities order by name"),
    customers: await create(
      "customers",
      "select 'Customer ' || lpad(g::text, 4, '0') as name, g as value from generate_series(1, 600) g"
    ),
    // neither name nor value: the first column is both
    categories: await create("categories", "select distinct category from orders order by 1"),
  };
}

const selected = (page: Parameters<typeof valueInput>[0], name: string) =>
  valueInput(page, name).locator(".ant-select-selection-item");

test.describe("Query based dropdown list", () => {
  test("the settings dialog searches for the source query and the parameters take their values from it", async ({
    page,
    api,
    seed,
  }) => {
    const sources = await createSources(api, seed.dataSources.postgres);
    const sourceNames = Object.fromEntries(
      await Promise.all(
        Object.entries(sources).map(async ([key, id]) => [key, (await api.get(`/api/queries/${id}`)).name])
      )
    );
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P query dropdown"),
      dataSourceId: seed.dataSources.postgres,
      sql:
        "select c.id, c.name, {{ cust }} as cust,\n" +
        " (select string_agg(distinct category, ',' order by category) from orders where category in ({{ cats }})) as cats\n" +
        "from cities c where c.id = {{ city }}",
      options: { parameters: ["cust", "cats", "city"].map((name) => parameter({ name })) },
      run: false,
    });
    await openSource(page, id);

    const pickSource = async (name: string, key: keyof typeof sources, multiple = false) => {
      await openSettings(page, name);
      await chooseType(page, "Query Based Dropdown List");
      // Nothing can be confirmed before a query is chosen
      await expect(byTest(page, "SaveParameterSettings")).toBeDisabled();
      await byTest(dialog(page), "QuerySelector").locator(".ant-select-selector").click();
      await page.keyboard.type(sourceNames[key]);
      await byTest(page, `QueryId${sources[key]}`).click();
      await expect(byTest(dialog(page), "QuerySelector").locator(".ant-select-selection-item")).toContainText(
        sourceNames[key]
      );
      await expect(byTest(page, "SaveParameterSettings")).toBeEnabled();
      if (multiple) {
        await allowMultiple(page, "Single Quotation Mark");
      }
      await confirmSettings(page);
    };
    await pickSource("city", "cities");
    await pickSource("cust", "customers");
    await pickSource("cats", "categories", true);

    // A single-value dropdown starts with the first option of its query
    await expect(selected(page, "city")).toHaveText("Austin");
    await expect(selected(page, "cust")).toHaveText("Customer 0001");

    await choose(page, "city", "Paris");
    await choose(page, "cust", "Customer 0003");
    await choose(page, "cats", "Hardware", "Training");
    await expect(tags(page, "cats")).toHaveText(["Hardware", "Training"]);
    await apply(page);
    await expectRows(page, [{ id: "6", name: "Paris", cust: "3", cats: "Hardware,Training" }]);

    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.type, p.queryId]))
      .toEqual([
        ["cust", "query", sources.customers],
        ["cats", "query", sources.categories],
        ["city", "query", sources.cities],
      ]);

    // Reopened, the dialog shows which query the values come from
    await openSettings(page, "cust");
    await expect(byTest(dialog(page), "QuerySelector")).toContainText(sourceNames.customers);
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
  });

  test("name/value columns: the name is shown and the value is used, saved and put in the URL", async ({
    page,
    api,
    seed,
  }) => {
    const sources = await createSources(api, seed.dataSources.postgres);
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P name value"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select c.id, c.name, '{{ cat }}' as cat from cities c where c.id = {{ city }}",
      options: {
        parameters: [
          parameter({ name: "city", type: "query", queryId: sources.cities, value: "2" }),
          parameter({ name: "cat", type: "query", queryId: sources.categories, value: "Hardware" }),
        ],
      },
    });
    await openSource(page, id);
    await expect(selected(page, "city")).toHaveText("Berlin");
    await expectRows(page, [{ id: "2", name: "Berlin", cat: "Hardware" }]);

    await openDropdown(page, "city");
    await expect(selectOptions(page)).toHaveText(CITY_NAMES);
    await option(page, "Paris").click();
    await expect(selected(page, "city")).toHaveText("Paris");

    // A source without name/value columns offers its first column
    await openDropdown(page, "cat");
    await expect(selectOptions(page)).toHaveText(["Hardware", "Services", "Software", "Training"]);
    await option(page, "Software").click();

    await expectPending(page, 2);
    await apply(page);
    await expectRows(page, [{ id: "6", name: "Paris", cat: "Software" }]);
    await expect(page).toHaveURL(/[?&]p_city=6(&|$)/);
    await expect(page).toHaveURL(/[?&]p_cat=Software(&|$)/);

    await saveQuery(page);
    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.value]))
      .toEqual([
        ["city", "6"],
        ["cat", "Software"],
      ]);

    await openSource(page, id);
    await expect(selected(page, "city")).toHaveText("Paris");
    await expectRows(page, [{ id: "6", name: "Paris", cat: "Software" }]);

    // Keyboard only: open, type to filter, Enter to choose, Cmd/Ctrl+Enter to apply
    await openDropdown(page, "city");
    await page.keyboard.type("ber");
    await expect(selectOptions(page)).toHaveText(["Berlin"]);
    // Enter chooses the highlighted option; the highlight is set a render after the list is filtered
    await expect(selectOptions(page)).toHaveClass(/ant-select-item-option-active/);
    await page.keyboard.press("Enter");
    await expect(selected(page, "city")).toHaveText("Berlin");
    await page.keyboard.press(`${MOD}+Enter`);
    await expectRows(page, [{ id: "2", name: "Berlin", cat: "Software" }]);
    await expect(page).toHaveURL(/[?&]p_city=2(&|$)/);
  });

  test("a dropdown with 600 options renders a few rows, scrolls with the wheel and is searched by typing", async ({
    page,
    api,
    seed,
  }) => {
    const sources = await createSources(api, seed.dataSources.postgres);
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P long dropdown"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select {{ cust }} as cust",
      // A string, as the dropdown's options are: a number would show up as a pending change when the page opens
      options: { parameters: [parameter({ name: "cust", type: "query", queryId: sources.customers, value: "1" })] },
    });
    await openSource(page, id);
    await expect(selected(page, "cust")).toHaveText("Customer 0001");
    await expectRows(page, [{ cust: "1" }]);

    await openDropdown(page, "cust");
    const list = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
    // Only the visible part of the 600 options is in the page
    await expect(selectOptions(page).first()).toHaveText("Customer 0001");
    expect(await selectOptions(page).count()).toBeLessThan(30);

    const box = await list.boundingBox();
    if (!box) {
      throw new Error("the dropdown is not visible");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(async () => {
      await page.mouse.wheel(0, 1500);
      const first = Number((await selectOptions(page).first().innerText()).replace("Customer ", ""));
      expect(first).toBeGreaterThan(200);
    }).toPass();
    await expect(option(page, "Customer 0001")).toHaveCount(0);

    await page.keyboard.type("0457");
    await expect(selectOptions(page)).toHaveText(["Customer 0457"]);
    await option(page, "Customer 0457").click();
    await expect(selected(page, "cust")).toHaveText("Customer 0457");
    await apply(page);
    await expectRows(page, [{ cust: "457" }]);

    // A search without a match shows no list at all, and the value stays
    await valueInput(page, "cust").locator(".ant-select-selector").click();
    await expect(list).toBeVisible();
    await page.keyboard.type("zzz");
    await expect(list).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(selected(page, "cust")).toHaveText("Customer 0457");
    await expectPending(page, 0);
  });
});
