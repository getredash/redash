import { trim } from "lodash";
import { format } from "sql-formatter";

interface QueryFormatterMap {
  sql: (queryText: string) => string;
  json: (queryText: string) => string;
}

const QueryFormatters: QueryFormatterMap = {
  sql: queryText => {
    const trimmedQuery = trim(queryText);

    let formattedQuery;
    try {
      formattedQuery = format(
        trimmedQuery,
        { paramTypes: { custom: [{ regex: '\\{\\{\\s*[^}]+\\s*\\}\\}' }] } },
      );
    } catch (error) {
      console.error("SQL formatting failed:", error);
      return trimmedQuery;
    }
    return formattedQuery;
  },
  json: queryText => JSON.stringify(JSON.parse(queryText), null, 4),
};

export function isFormatQueryAvailable(syntax: string): syntax is keyof QueryFormatterMap {
  // Now keyof QueryFormatterMap is "sql" | "json", which is assignable to string
  return syntax in QueryFormatters;
}

export function formatQuery(queryText: string, syntax: string): string {
  if (!isFormatQueryAvailable(syntax)) {
    return queryText;
  }
  const formatter = QueryFormatters[syntax as keyof QueryFormatterMap];
  try {
    return formatter(queryText);
  } catch (error) {
    return queryText;
  }
}
