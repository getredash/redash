import { Query } from "@/services/query";
import * as queryFormat from "./queryFormat";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("QueryFormat.formatQuery", () => {
  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
  test("returns same query text when syntax is not supported", () => {
    const unsupportedSyntax = "unsupported-syntax";
    const queryText = "select * from example";
    const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(unsupportedSyntax);
    const formattedQuery = queryFormat.formatQuery(queryText, unsupportedSyntax);

    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
    expect(isFormatQueryAvailable).toBeFalsy();
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
    expect(formattedQuery).toBe(queryText);
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("sql", () => {
    const syntax = "sql";

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
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
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(isFormatQueryAvailable).toBeTruthy();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(formattedQueryText).toBe(expectedFormattedQueryText);
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("still recognizes parameters after formatting", () => {
      const queryText = "select {{param1}}, {{ param2 }}, {{ date-range.start }} from example";
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);
      const queryParameters = new Query({ query: queryText }).getParameters().parseQuery();
      const formattedQueryParameters = new Query({ query: formattedQueryText }).getParameters().parseQuery();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(formattedQueryParameters.sort()).toEqual(queryParameters.sort());
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("json", () => {
    const syntax = "json";

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("returns the formatted query text", () => {
      const queryText = '{"collection": "example","limit": 10}';
      const expectedFormattedQueryText = '{\n    "collection": "example",\n    "limit": 10\n}';
      const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(syntax);
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(isFormatQueryAvailable).toBeTruthy();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(formattedQueryText).toBe(expectedFormattedQueryText);
    });
  });
});
