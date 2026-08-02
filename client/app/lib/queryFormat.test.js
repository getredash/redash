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

    test("preserves Postgres JSON containment operators", () => {
      const queryText = `
        select *
        from example
        where keywords @> '[{"keyword":{"id":12345}}]'
          and '[{"keyword":{"id":12345}}]' <@ keywords
      `;
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);

      expect(formattedQueryText).toContain('keywords @> \'[{"keyword":{"id":12345}}]\'');
      expect(formattedQueryText).toContain('\'[{"keyword":{"id":12345}}]\' <@ keywords');
      expect(formattedQueryText).not.toContain("@ >");
      expect(formattedQueryText).not.toContain("< @");
    });

    test("preserves Postgres JSON path and key operators", () => {
      const queryText = `
        select
          data #> '{a,b}' as path_json,
          data #>> '{a,b}' as path_text,
          data #- '{a,b}' as deleted_path
        from example
        where data ? 'key'
          and data ?| array['key1', 'key2']
          and data ?& array['key1', 'key2']
      `;
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);

      expect(formattedQueryText).toContain("data #> '{a,b}'");
      expect(formattedQueryText).toContain("data #>> '{a,b}'");
      expect(formattedQueryText).toContain("data #- '{a,b}'");
      expect(formattedQueryText).toContain("data ? 'key'");
      expect(formattedQueryText).toContain("data ?| array");
      expect(formattedQueryText).toContain("data ?& array");
      expect(formattedQueryText).not.toContain("# >");
      expect(formattedQueryText).not.toContain("# >>");
      expect(formattedQueryText).not.toContain("# -");
      expect(formattedQueryText).not.toContain("? |");
      expect(formattedQueryText).not.toContain("? &");
    });

    test("does not replace user query text that looks like an operator placeholder", () => {
      const queryText = `
        select '__REDASH_POSTGRES_JSON_OPERATOR_0__' as placeholder_text,
          data #>> '{a,b}' as path_text
        from example
      `;
      const formattedQueryText = queryFormat.formatQuery(queryText, syntax);

      expect(formattedQueryText).toContain("'__REDASH_POSTGRES_JSON_OPERATOR_0__'");
      expect(formattedQueryText).toContain("data #>> '{a,b}'");
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
