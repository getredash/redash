import { axios } from "@/services/axios";

/**
 * Generate a query from a natural language description using the configured LLM.
 *
 * @param {string} naturalLanguage - Plain English description of the desired query.
 * @param {object} [options]
 * @param {string} [options.dialect="sql"] - SQL dialect hint passed to the LLM.
 * @param {Array}  [options.schema=[]]    - Schema list (objects with name + columns).
 * @returns {Promise<string>} The generated query text.
 */
export function generateQuery(naturalLanguage, { dialect = "sql", schema = [] } = {}) {
  return axios.post("api/ai/generate_query", {
    natural_language: naturalLanguage,
    dialect,
    schema,
  });
}
