import { trim } from "lodash";
import sqlFormatter from "sql-formatter";

interface QueryFormatterMap {
  [syntax: string]: (queryText: string) => string;
}

const PostgreSqlJsonOperators = [
  ["@>", "__REDASH_POSTGRES_JSON_CONTAINS__"],
  ["<@", "__REDASH_POSTGRES_JSON_CONTAINED_BY__"],
];

function preservePostgreSqlJsonOperators(queryText: string) {
  return PostgreSqlJsonOperators.reduce(
    (text, [operator, replacement]) => text.split(operator).join(replacement),
    queryText
  );
}

function restorePostgreSqlJsonOperators(queryText: string) {
  return PostgreSqlJsonOperators.reduce(
    (text, [operator, replacement]) => text.split(replacement).join(operator),
    queryText
  );
}

function formatSqlQuery(queryText: string) {
  return restorePostgreSqlJsonOperators(sqlFormatter.format(preservePostgreSqlJsonOperators(trim(queryText))));
}

const QueryFormatters: QueryFormatterMap = {
  sql: formatSqlQuery,
  json: (queryText) => JSON.stringify(JSON.parse(queryText), null, 4),
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
