import { isDateTime } from "@/services/query-result";

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

jest.mock("@/services/axios", () => ({ axios: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));

describe("QueryResult.getRows", () => {
  const { axios } = require("@/services/axios");
  const QueryResult = require("@/services/query-result").default;

  function makeResult(rows, rowCount, extra = {}) {
    return new QueryResult({
      query_result: { id: 7, row_count: rowCount, data: { columns: [{ name: "n" }], rows } },
      ...extra,
    });
  }

  beforeEach(() => {
    axios.get.mockReset();
  });

  it("serves loaded rows without a request", async () => {
    const result = makeResult([{ n: 0 }, { n: 1 }, { n: 2 }], 100);

    await expect(result.getRows(1, 2)).resolves.toEqual({ rows: [{ n: 1 }, { n: 2 }], rowCount: 100 });
    expect(result.getRowCount()).toBe(100);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("fetches rows past the loaded ones from the result", async () => {
    axios.get.mockResolvedValue({ rows: [{ n: 50, at: "2022-01-01T00:00:00" }], row_count: 100 });
    const result = makeResult([{ n: 0 }], 100);

    const { rows } = await result.getRows(50, 1);

    expect(axios.get).toHaveBeenCalledWith("api/query_results/7/rows", { params: { offset: 50, limit: 1 } });
    expect(rows[0].at.isValid()).toBe(true); // converted like the first rows
  });

  it("sends the query parameters when reading through a query", async () => {
    axios.get.mockResolvedValue({ rows: [], row_count: 100 });
    const result = makeResult([{ n: 0 }], 100, { queryId: 3, parameters: { p: [1, 2] } });

    await result.getRows(25, 25);

    expect(axios.get).toHaveBeenCalledWith("api/queries/3/results/7/rows", {
      params: { offset: 25, limit: 25, parameters: '{"p":[1,2]}' },
    });
  });

  it("falls back to the loaded rows count for results without row_count", () => {
    const result = new QueryResult({ query_result: { id: 7, data: { columns: [], rows: [{}, {}] } } });

    expect(result.getRowCount()).toBe(2);
  });
});

describe("Loading results with only the rows shown first", () => {
  const { axios } = require("@/services/axios");
  const { clientConfig } = require("@/services/auth");
  const { default: QueryResult, getInitialRowLimit } = require("@/services/query-result");

  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    clientConfig.queryResultsMaxPageRows = 1000;
  });

  it("asks for one page of a table, and a full page for other visualizations", () => {
    expect(getInitialRowLimit({ type: "TABLE", options: { itemsPerPage: 50 } })).toBe(50);
    expect(getInitialRowLimit({ type: "TABLE", options: {} })).toBe(25);
    expect(getInitialRowLimit({ type: "CHART", options: {} })).toBe(0);
    expect(getInitialRowLimit({ type: "CHART", options: { globalSeriesType: "custom" } })).toBe(1000);
    expect(getInitialRowLimit({ type: "PIVOT", options: {} })).toBe(1000);
  });

  it("sends the row limit when loading a result", () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    axios.post.mockReturnValue(new Promise(() => {}));

    QueryResult.getById(3, 7, 25);
    QueryResult.getByQueryId(3, { p: 1 }, false, -1, 25);

    expect(axios.get).toHaveBeenCalledWith("api/queries/3/results/7.json", { params: { limit: 25 } });
    expect(axios.post).toHaveBeenCalledWith("api/queries/3/results", expect.objectContaining({ limit: 25 }));
  });

  it("loadRows fetches only the missing rows, up to a full page", async () => {
    axios.get.mockImplementation((url, { params }) =>
      Promise.resolve({
        rows: Array.from({ length: params.limit }, (unused, i) => ({ n: params.offset + i })),
        row_count: 5000,
      })
    );
    clientConfig.queryResultsMaxPageRows = 100;
    const result = new QueryResult({
      query_result: { id: 7, row_count: 5000, data: { columns: [{ name: "n" }], rows: [{ n: 0 }, { n: 1 }] } },
    });

    await result.loadRows(1000);

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith("api/query_results/7/rows", { params: { offset: 2, limit: 98 } });
    expect(result.getData()).toHaveLength(100);
    expect(result.getData()[99]).toEqual({ n: 99 });

    await result.loadRows(1000);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("is empty only when the result has no rows at all", () => {
    expect(new QueryResult({ query_result: { row_count: 10, data: { columns: [], rows: [] } } }).isEmpty()).toBe(false);
    expect(new QueryResult({ query_result: { row_count: 0, data: { columns: [], rows: [] } } }).isEmpty()).toBe(true);
  });
});

describe("Filters and chart marks come from the server", () => {
  const { axios } = require("@/services/axios");
  const { default: QueryResult, getFilterSelection } = require("@/services/query-result");

  beforeEach(() => {
    axios.get.mockReset();
  });

  function makeResult(extra = {}) {
    return new QueryResult({
      query_result: {
        id: 7,
        row_count: 100,
        filter_values: { "day::filter": ["2022-01-01T00:00:00", "2022-01-02T00:00:00"], "k::multi-filter": ["a", "b"] },
        data: { columns: [{ name: "day::filter" }, { name: "k::multi-filter" }], rows: [] },
      },
      ...extra,
    });
  }

  it("takes filter values from the server and selects the first, or every one of a multi-filter", () => {
    const [day, kind] = makeResult().getFilters();

    expect(day.values[0].isValid()).toBe(true); // shown like row values
    expect(day.current).toBe(day.values[0]);
    expect(kind.current).toEqual(["a", "b"]);
  });

  it("sends the stored values of filters that leave rows out", () => {
    const [day, kind] = makeResult().getFilters();

    expect(getFilterSelection([day, kind])).toEqual({ "day::filter": ["2022-01-01T00:00:00"] });
    expect(getFilterSelection([{ ...kind, current: ["b"] }])).toEqual({ "k::multi-filter": ["b"] });
  });

  it("filters rows on the server", async () => {
    axios.get.mockResolvedValue({ rows: [{ n: 1 }], row_count: 40 });

    const page = await makeResult().getRows(0, 25, { "k::multi-filter": ["b"] });

    expect(axios.get).toHaveBeenCalledWith("api/query_results/7/rows", {
      params: { offset: 0, limit: 25, filters: '{"k::multi-filter":["b"]}' },
    });
    expect(page).toEqual({ rows: [{ n: 1 }], rowCount: 40 });
  });

  it("gets chart marks, keeping box stats as they are", async () => {
    const box = { q1: 1, median: 2, q3: 3, lowerfence: 0, upperfence: 4, points: [] };
    axios.get.mockResolvedValue({ marks: [{ day: "2022-01-01T00:00:00", n: 3, $box: box }] });
    const options = { globalSeriesType: "box", columnMapping: {} };

    const marks = await makeResult({ queryId: 3, parameters: {} }).getChartMarks(options, {}, 800, 600);

    expect(axios.get).toHaveBeenCalledWith("api/queries/3/results/7/chart", {
      params: { options: JSON.stringify(options), width: 800, height: 600, parameters: "{}" },
    });
    expect(marks[0].day.isValid()).toBe(true);
    expect(marks[0].$box).toEqual(box);
  });
});
