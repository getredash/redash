import { trim } from "lodash";
import { format } from "sql-formatter";
import { formatterConfig } from './formatterConfig';

interface QueryFormatterMap {
  [syntax: string]: (queryText: string) => string;
}

const QueryFormatters: QueryFormatterMap = {
  sql: queryText => format(trim(queryText), formatterConfig),
  json: queryText => JSON.stringify(JSON.parse(queryText), null, 4),
};

export function isFormatQueryAvailable(syntax: string) {
  return syntax in QueryFormatters;
}

export function formatQuery(queryText: string, syntax: string) {
  if (!isFormatQueryAvailable(syntax)) {
    return queryText;
  }
  const formatter = QueryFormatters[syntax];
  return formatter(queryText);
}
