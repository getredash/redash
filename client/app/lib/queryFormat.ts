import { trim } from "lodash";
import sqlFormatter from "sql-formatter";

interface QueryFormatterMap {
  [syntax: string]: (queryText: string) => string;
}

const PostgreSqlJsonOperators = ["#>>", "#>", "#-", "?&", "?|", "@>", "<@", "?"];

function getPostgreSqlJsonOperatorPlaceholders(queryText: string) {
  let suffix = 0;

  return PostgreSqlJsonOperators.map((operator) => {
    let replacement;

    do {
      replacement = `__REDASH_POSTGRES_JSON_OPERATOR_${suffix}__`;
      suffix += 1;
    } while (queryText.includes(replacement));

    return [operator, replacement];
  });
}

function preservePostgreSqlJsonOperators(queryText: string, placeholders: string[][]) {
  return placeholders.reduce((text, [operator, replacement]) => text.split(operator).join(replacement), queryText);
}

function restorePostgreSqlJsonOperators(queryText: string, placeholders: string[][]) {
  return placeholders.reduce((text, [operator, replacement]) => text.split(replacement).join(operator), queryText);
}

function formatSqlQuery(queryText: string) {
  const trimmedQueryText = trim(queryText);
  const placeholders = getPostgreSqlJsonOperatorPlaceholders(trimmedQueryText);

  return restorePostgreSqlJsonOperators(
    sqlFormatter.format(preservePostgreSqlJsonOperators(trimmedQueryText, placeholders)),
    placeholders
  );
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
