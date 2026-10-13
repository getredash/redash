import { MOD } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi } from "../../support/ui";
import {
  apply,
  choose,
  expectPending,
  expectRows,
  field,
  openSource,
  openView,
  order,
  parameter,
  runError,
  saveQuery,
  savedParameters,
  shown,
  typeValue,
  valueInput,
} from "./helpers";

const SQL = `select id, name, 100 / {{ divisor }} as q, '{{ label }}' as label
from cities where name like '{{ pat }}' and date '2026-01-01' <= '{{ until }}' order by id`;

const row = (id: string, name: string, q: string, label: string) => ({ id, name, q, label });
const LABEL = "héllo wörld ✓";

async function createQuery(api: RedashApi, dataSourceId: number) {
  const name = uniqueName("P save fork view");
  const { id } = await createQueryViaApi(api, {
    name,
    dataSourceId,
    sql: SQL,
    options: {
      parameters: [
        parameter({ name: "divisor", type: "number", value: 4 }),
        parameter({ name: "label", value: LABEL }),
        parameter({ name: "pat", value: "T%" }),
        parameter({ name: "until", type: "date", value: "2026-12-31" }),
      ],
    },
  });
  return { id, name };
}

const T_CITIES = [row("1", "Tel Aviv", "25", LABEL), row("4", "Tokyo", "25", LABEL), row("9", "Toronto", "25", LABEL)];

test.describe("Saving, forking and viewing a query with parameters", () => {
  test("values saved with the query come back, with the cached result, when it is reopened from the list", async ({
    page,
    api,
    seed,
  }) => {
    const { id, name } = await createQuery(api, seed.dataSources.postgres);
    const formats = await openSource(page, id);
    await expectRows(page, T_CITIES);

    await typeValue(page, "pat", "S%");
    await typeValue(page, "divisor", "50");
    await apply(page);
    await expectRows(page, [row("7", "Sao Paulo", "2", LABEL), row("8", "Sydney", "2", LABEL)]);
    await saveQuery(page);
    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.type, p.value]))
      .toEqual([
        ["divisor", "number", 50],
        ["label", "text", LABEL],
        ["pat", "text", "S%"],
        ["until", "date", "2026-12-31"],
      ]);

    await page.goto("/queries");
    await page.locator('input[placeholder*="Search"]').first().fill(name);
    await page.locator("table a").filter({ hasText: name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/queries/${id}(\\?|$)`));
    await expect(field(page, "divisor")).toHaveValue("50");
    expect(await order(page)).toEqual(["divisor", "label", "pat", "until"]);
    await expect(field(page, "label")).toHaveValue(LABEL);
    await expect(field(page, "pat")).toHaveValue("S%");
    await expect(field(page, "until")).toHaveValue(shown(formats, "2026-12-31"));
    await expectRows(page, [row("7", "Sao Paulo", "2", LABEL), row("8", "Sydney", "2", LABEL)]);
    await expectPending(page, 0);
  });

  test("Fork opens an unpublished copy with the same parameters and values; changing it leaves the original alone", async ({
    page,
    context,
    api,
    seed,
  }) => {
    const { id, name } = await createQuery(api, seed.dataSources.postgres);
    await openSource(page, id);
    await expectRows(page, T_CITIES);
    // A value that is applied but not saved travels to the fork with the URL
    await typeValue(page, "divisor", "5");
    await apply(page);
    await expectRows(
      page,
      T_CITIES.map((city) => ({ ...city, q: "20" }))
    );

    await byTest(page, "QueryPageHeaderMoreButton").click();
    const [fork] = await Promise.all([
      context.waitForEvent("page"),
      page.locator(".ant-dropdown-menu-item").filter({ hasText: "Fork" }).click(),
    ]);
    await fork.waitForURL(/\/queries\/\d+\/source/);
    const forkId = Number(fork.url().match(/\/queries\/(\d+)/)?.[1]);
    expect(forkId).not.toBe(id);
    await expect(fork.locator(".query-page-header, .page-header--query").first()).toContainText(
      `Copy of (#${id}) ${name}`
    );
    expect(await order(fork)).toEqual(["divisor", "label", "pat", "until"]);
    await expect(field(fork, "divisor")).toHaveValue("5");
    await expect(field(fork, "pat")).toHaveValue("T%");
    await expect(field(fork, "label")).toHaveValue(LABEL);

    const forked = await api.get(`/api/queries/${forkId}`);
    expect(forked.is_draft).toBe(true);
    expect(forked.query).toBe(SQL);
    const definition = (p: { name: string; type: string; title: string }) => [p.name, p.type, p.title];
    expect(forked.options.parameters.map(definition)).toEqual((await savedParameters(api, id)).map(definition));

    await typeValue(fork, "pat", "S%");
    await apply(fork);
    await expectRows(fork, [row("7", "Sao Paulo", "20", LABEL), row("8", "Sydney", "20", LABEL)]);
    await saveQuery(fork);
    await expect.poll(async () => (await savedParameters(api, forkId)).find((p) => p.name === "pat")?.value).toBe("S%");
    await fork.close();

    expect((await savedParameters(api, id)).map((p) => [p.name, p.value])).toEqual([
      ["divisor", 4],
      ["label", LABEL],
      ["pat", "T%"],
      ["until", "2026-12-31"],
    ]);
    await openSource(page, id);
    await expect(field(page, "pat")).toHaveValue("T%");
    await expectRows(page, T_CITIES);
  });

  test("the read-only page has the parameter bar without cogs or handles; Apply, the shortcut and Refresh run it", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQuery(api, seed.dataSources.postgres);
    await openView(page, id);
    await expectRows(page, T_CITIES);
    expect(await order(page)).toEqual(["divisor", "label", "pat", "until"]);
    await expect(page.locator('[data-test^="ParameterSettings-"]')).toHaveCount(0);
    await expect(page.locator('[data-test^="DragHandle-"]')).toHaveCount(0);
    await expect(byTest(page, "QueryEditor")).toHaveCount(0);

    await typeValue(page, "pat", "%o%");
    await expect(valueInput(page, "pat")).toHaveAttribute("data-dirty", "true");
    await expectPending(page, 1);
    await apply(page);
    await expectRows(
      page,
      [
        ["3", "Lisbon"],
        ["4", "Tokyo"],
        ["7", "Sao Paulo"],
        ["9", "Toronto"],
        ["10", "Nairobi"],
        ["12", "London"],
      ].map(([cityId, city]) => row(cityId, city, "25", LABEL))
    );

    await typeValue(page, "pat", "T%");
    await typeValue(page, "divisor", "50");
    await page.keyboard.press(`${MOD}+Enter`);
    await expectRows(
      page,
      T_CITIES.map((city) => ({ ...city, q: "2" }))
    );

    // Refresh runs the query again with the values that are applied
    const run = page.waitForResponse(
      (response) =>
        new RegExp(`/api/queries/${id}/results$`).test(response.url()) && response.request().method() === "POST"
    );
    await page
      .getByRole("button", { name: /Refresh/ })
      .first()
      .click();
    expect((await run).request().postDataJSON()).toMatchObject({
      max_age: 0,
      parameters: { divisor: 50, label: LABEL, pat: "T%", until: "2026-12-31" },
    });
    await expectRows(
      page,
      T_CITIES.map((city) => ({ ...city, q: "2" }))
    );
  });

  test("a user without edit rights can change values and run, and gets no cogs, handles or Save button", async ({
    viewerPage,
    api,
    seed,
  }) => {
    // Without text parameters, so that a user with view-only access to the data source may run it
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P viewer"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select {{ num }} + 1 as num1, '{{ cat }}' as cat",
      options: {
        parameters: [
          parameter({ name: "num", type: "number", value: 1 }),
          parameter({ name: "cat", type: "enum", enumOptions: "Hardware\nSoftware\nServices", value: "Hardware" }),
        ],
      },
    });
    await openView(viewerPage, id);
    await expectRows(viewerPage, [{ num1: "2", cat: "Hardware" }]);
    await expect(viewerPage.locator('[data-test^="ParameterSettings-"]')).toHaveCount(0);
    await expect(viewerPage.locator('[data-test^="DragHandle-"]')).toHaveCount(0);

    await typeValue(viewerPage, "num", "10");
    await choose(viewerPage, "cat", "Services");
    await expectPending(viewerPage, 2);
    await apply(viewerPage);
    await expectRows(viewerPage, [{ num1: "11", cat: "Services" }]);
    await expect(viewerPage).toHaveURL(/[?&]p_num=10(&|$)/);

    await viewerPage.goto(`/queries/${id}/source`);
    await expect(byTest(viewerPage, "ParameterName-num")).toBeVisible();
    await expect(viewerPage.locator('[data-test^="ParameterSettings-"]')).toHaveCount(0);
    await expect(viewerPage.locator('[data-test^="DragHandle-"]')).toHaveCount(0);
    await expect(byTest(viewerPage, "SaveButton")).toHaveCount(0);
    // Nothing the viewer did changed the query
    expect((await savedParameters(api, id)).map((p) => [p.name, p.value])).toEqual([
      ["num", 1],
      ["cat", "Hardware"],
    ]);
  });

  test("a value that makes the SQL fail shows the database error; a corrected value brings the result back", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQuery(api, seed.dataSources.postgres);
    await openView(page, id);
    await expectRows(page, T_CITIES);

    await typeValue(page, "divisor", "0");
    await apply(page);
    await expect(runError(page)).toContainText("Error running query: division by zero");
    await expect(field(page, "divisor")).toHaveValue("0");

    await typeValue(page, "divisor", "5");
    await apply(page);
    await expectRows(
      page,
      T_CITIES.map((city) => ({ ...city, q: "20" }))
    );
    await expect(runError(page)).toHaveCount(0);

    // A quote in a text value is placed in the SQL as it is
    await openSource(page, id);
    await expectRows(page, T_CITIES);
    await typeValue(page, "label", "O'Hare");
    await apply(page);
    await expect(runError(page)).toContainText(/Error running query: syntax error at or near.*'O'Hare' as label/s);

    await typeValue(page, "label", "plain");
    await apply(page);
    await expectRows(
      page,
      T_CITIES.map((city) => ({ ...city, label: "plain" }))
    );
    await expect(runError(page)).toHaveCount(0);
  });
});
