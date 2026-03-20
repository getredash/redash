import QueryResult, { isDateTime } from "@/services/query-result";

describe("isDateTime", () => {
  it.each([
    ["2022-01-01T00:00:00", true],
    ["2022-01-01T00:00:00+09:00", true],
    ["2021-01-27T00:00:01.733983944+03:00 stderr F {", false],
    ["2021-01-27Z00:00:00+09:00", false],
    ["2021-01-27", false],
    ["foo bar", false],
    [2022, false],
    [null, false],
    ["", false],
  ])("isDateTime('%s'). expected '%s'.", (value, expected) => {
    expect(isDateTime(value)).toBe(expected);
  });
});

describe("QueryResult filters", () => {
  test("recognizes lowercase multiFilter aliases returned by SQL engines", () => {
    const queryResult = new QueryResult({
      query_result: {
        data: {
          columns: [
            { name: "action__multifilter", type: "string" },
            { name: "value", type: "integer" },
          ],
          rows: [
            { action__multifilter: "login", value: 1 },
            { action__multifilter: "view", value: 2 },
          ],
        },
      },
    });

    expect(queryResult.getFilters()).toEqual([
      expect.objectContaining({
        name: "action__multifilter",
        friendlyName: "Action",
        multiple: true,
        values: ["login", "view"],
        current: ["login", "view"],
      }),
    ]);
  });
});
