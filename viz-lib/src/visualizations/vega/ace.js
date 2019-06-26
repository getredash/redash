import ace from "ace-builds";

import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-textmate";

export function initAce() {
  langTools.setCompleters([langTools.snippetCompleter, langTools.keyWordCompleter, langTools.textCompleter]);
}

export const langTools = ace.acequire("ace/ext/language_tools");
