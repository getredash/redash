import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, retype, tableRows } from "../../support/ui";
import { Created, everyMinute, getQuery, latestRows, setSchedule } from "./helpers";

test.describe("A scheduled query with a parameter", () => {
  const created = new Created();
  test.afterAll(async ({ api, seed }) => {
    await created.cleanup(api, seed.dataSources.postgres);
  });

  test("@slow is refreshed with the parameter's saved value", async ({ page, api, seed }) => {
    test.setTimeout(5 * 60_000);
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("S param default"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select '{{ s_word }}' as word, length('{{ s_word }}') as len, to_char(now(), 'HH24:MI:SS.US') as ran_at",
      options: { parameters: [{ name: "s_word", title: "s_word", type: "text", value: "x" }] },
      run: false,
    });
    created.queries.push(id);

    // Type the value, apply it (which runs the query) and save it as the default
    await page.goto(`/queries/${id}/source`);
    // The page first runs the query with the value it has
    await expect.poll(async () => (await tableRows(page))[0]?.slice(0, 2), { timeout: 60_000 }).toEqual(["x", "1"]);
    await byTest(page, "ParameterName-s_word").locator("input").click();
    await retype(page, "sdefault");
    await byTest(page, "ParameterApplyButton").locator("button").click();
    await expect
      .poll(async () => (await tableRows(page))[0]?.slice(0, 2), { timeout: 60_000 })
      .toEqual(["sdefault", "8"]);
    const saved = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().endsWith(`/api/queries/${id}`)
    );
    await byTest(page, "SaveButton").click();
    expect((await saved).status()).toBe(200);
    const manual = await getQuery(api, id);
    expect(manual.options.parameters?.[0]).toMatchObject({ name: "s_word", value: "sdefault" });

    await setSchedule(api, id, everyMinute);
    await expect
      .poll(async () => (await getQuery(api, id)).latest_query_data_id, {
        timeout: 180_000,
        intervals: [3000],
        message: "a scheduled refresh stores a new result",
      })
      .not.toBe(manual.latest_query_data_id);
    const [row] = await latestRows(api, id);
    expect(row).toMatchObject({ word: "sdefault", len: 8 });

    // The page shows the scheduled result for the saved value
    await page.goto(`/queries/${id}`);
    await expect(byTest(page, "ParameterName-s_word").locator("input")).toHaveValue("sdefault");
    await expect.poll(async () => (await tableRows(page))[0]?.slice(0, 2)).toEqual(["sdefault", "8"]);
  });
});
