import { isNil, map } from "lodash";
import AceEditor from "react-ace";
import ace from "brace";

import "brace/ext/language_tools";
import "brace/mode/json";
import "brace/mode/python";
import "brace/mode/sql";
import "brace/mode/yaml";
import "brace/theme/textmate";
import "brace/ext/searchbox";

const langTools = ace.acequire("ace/ext/language_tools");
const snippetsModule = ace.acequire("ace/snippets");

// By default Ace will try to load snippet files for the different modes and fail.
// We don't need them, so we use these placeholders until we define our own.
function defineDummySnippets(mode) {
  ace.define(`ace/snippets/${mode}`, ["require", "exports", "module"], (require, exports) => {
    exports.snippetText = "";
    exports.scope = mode;
  });
}

defineDummySnippets("python");
defineDummySnippets("sql");
defineDummySnippets("json");
defineDummySnippets("yaml");

function buildTableColumnKeywords(table) {
  const keywords = [];
  table.columns.forEach(column => {
    keywords.push({
      caption: column,
      name: `${table.name}.${column}`,
      value: `${table.name}.${column}`,
      score: 100,
      meta: "Column",
      className: "completion",
    });
  });
  return keywords;
}

function buildKeywordsFromSchema(schema) {
  const tableKeywords = [];
  const columnKeywords = {};
  const tableColumnKeywords = {};

  schema.forEach(table => {
    tableKeywords.push({
      name: table.name,
      value: table.name,
      score: 100,
      meta: "Table",
    });
    tableColumnKeywords[table.name] = buildTableColumnKeywords(table);
    table.columns.forEach(c => {
      columnKeywords[c] = "Column";
    });
  });

  return {
    table: tableKeywords,
    column: map(columnKeywords, (v, k) => ({
      name: k,
      value: k,
      score: 50,
      meta: v,
    })),
    tableColumn: tableColumnKeywords,
  };
}

const schemaCompleterKeywords = {};

export function updateSchemaCompleter(editorKey, schema = null) {
  schemaCompleterKeywords[editorKey] = isNil(schema) ? null : buildKeywordsFromSchema(schema);
}

langTools.setCompleters([
  langTools.snippetCompleter,
  langTools.keyWordCompleter,
  langTools.textCompleter,
  {
    identifierRegexps: [/[a-zA-Z_0-9.\-\u00A2-\uFFFF]/],
    getCompletions: (editor, session, pos, prefix, callback) => {
      const { table, column, tableColumn } = schemaCompleterKeywords[editor.id] || {
        table: [],
        column: [],
        tableColumn: [],
      };

      if (prefix.length === 0 || table.length === 0) {
        callback(null, []);
        return;
      }

      if (prefix[prefix.length - 1] === ".") {
        const tableName = prefix.substring(0, prefix.length - 1);
        callback(null, table.concat(tableColumn[tableName]));
        return;
      }
      callback(null, table.concat(column));
    },
  },
]);

export { AceEditor, langTools, snippetsModule };
