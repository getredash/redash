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

export { AceEditor, langTools, snippetsModule };
