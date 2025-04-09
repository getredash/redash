import React, { forwardRef } from "react";
import AceEditor from "react-ace";

// Import required Ace modules to ensure proper loading
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-textmate";
import "ace-builds/src-noconflict/ext-language_tools";

import "./AceEditorInput.less";

function AceEditorInput(props, ref) {
  return (
    <div className="ace-editor-input" data-test={props["data-test"]}>
      <AceEditor
        ref={ref}
        mode="sql"
        theme="textmate"
        height="100px"
        editorProps={{ $blockScrolling: Infinity }}
        showPrintMargin={false}
        {...props}
      />
    </div>
  );
}

export default forwardRef(AceEditorInput);
