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
// @ts-expect-error ts-migrate(2551) FIXME: Property 'acequire' does not exist on type 'typeof... Remove this comment to see the full error message
const langTools = ace.acequire("ace/ext/language_tools");
// @ts-expect-error ts-migrate(2551) FIXME: Property 'acequire' does not exist on type 'typeof... Remove this comment to see the full error message
const snippetsModule = ace.acequire("ace/snippets");
// By default Ace will try to load snippet files for the different modes and fail.
// We don't need them, so we use these placeholders until we define our own.
function defineDummySnippets(mode: any) {
    (ace as any).define(`ace/snippets/${mode}`, ["require", "exports", "module"], (require: any, exports: any) => {
        exports.snippetText = "";
        exports.scope = mode;
    });
}
defineDummySnippets("python");
defineDummySnippets("sql");
defineDummySnippets("json");
defineDummySnippets("yaml");
function buildTableColumnKeywords(table: any) {
    const keywords: any = [];
    table.columns.forEach((column: any) => {
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
function buildKeywordsFromSchema(schema: any) {
    const tableKeywords: any = [];
    const columnKeywords = {};
    const tableColumnKeywords = {};
    schema.forEach((table: any) => {
        tableKeywords.push({
            name: table.name,
            value: table.name,
            score: 100,
            meta: "Table",
        });
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        tableColumnKeywords[table.name] = buildTableColumnKeywords(table);
        table.columns.forEach((c: any) => {
            const columnName = get(c, "name", c);
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
export function updateSchemaCompleter(editorKey: any, schema = null) {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    schemaCompleterKeywords[editorKey] = isNil(schema) ? null : buildKeywordsFromSchema(schema);
}
langTools.setCompleters([
    langTools.snippetCompleter,
    langTools.keyWordCompleter,
    langTools.textCompleter,
    {
        identifierRegexps: [/[a-zA-Z_0-9.\-\u00A2-\uFFFF]/],
        getCompletions: (editor: any, session: any, pos: any, prefix: any, callback: any) => {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
