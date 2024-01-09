import { capitalize, isNil, map, get } from "lodash";
import AceEditor from "react-ace";
import ace from "ace-builds";

import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-textmate";
import "ace-builds/src-noconflict/ext-searchbox";

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

// without this line, ace will try to load a non-existent mode-custom.js file
// for data sources with syntax = "custom"
ace.define("ace/mode/custom", [], () => {});

function buildTableColumnKeywords(table) {
  const keywords = [];
  table.columns.forEach(column => {
    const columnName = get(column, "name");
    keywords.push({
      name: `${table.name}.${columnName}`,
      value: `${table.name}.${columnName}`,
      score: 100,
      meta: capitalize(get(column, "type", "Column")),
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
      const columnName = get(c, "name", c);
      columnKeywords[columnName] = capitalize(get(c, "type", "Column"));
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
