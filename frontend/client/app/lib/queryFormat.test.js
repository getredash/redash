import { Query } from "@/services/query";
import * as queryFormat from "./queryFormat";

describe("QueryFormat.formatQuery", () => {
  test("returns same query text when syntax is not supported", () => {
    const unsupportedSyntax = "unsupported-syntax";
    const queryText = "select * from example";
    const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(unsupportedSyntax);
    const formattedQuery = queryFormat.formatQuery(queryText, unsupportedSyntax);

    expect(isFormatQueryAvailable).toBeFalsy();
    expect(formattedQuery).toBe(queryText);
  });

  describe("sql", () => {
    const syntax = "sql";

    test("returns the formatted query text", () => {
      const queryText = "select column1, column2 from example where column1 = 2";
      const expectedFormattedQueryText = [
        "select",
        "  column1,",
        "  column2",
        "from",
        "  example",
        "where",
        "  column1 = 2",
      ].join("\n");
      const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(syntax);
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);
      expect(isFormatQueryAvailable).toBeTruthy();
      expect(formattedQueryText).toBe(expectedFormattedQueryText);
    });

    test("still recognizes parameters after formatting", () => {
      const queryText = "select {{param1}}, {{ param2 }}, {{ date-range.start }} from example";
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);
      const queryParameters = new Query({ query: queryText }).getParameters().parseQuery();
      const formattedQueryParameters = new Query({ query: formattedQueryText }).getParameters().parseQuery();
      expect(formattedQueryParameters.sort()).toEqual(queryParameters.sort());
    });
  });

  describe("json", () => {
    const syntax = "json";

    test("returns the formatted query text", () => {
      const queryText = '{"collection": "example","limit": 10}';
      const expectedFormattedQueryText = '{\n    "collection": "example",\n    "limit": 10\n}';
      const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(syntax);
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);
      expect(isFormatQueryAvailable).toBeTruthy();
      expect(formattedQueryText).toBe(expectedFormattedQueryText);
    });
  });
});
