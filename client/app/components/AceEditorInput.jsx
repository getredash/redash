import React, { forwardRef } from "react";
import AceEditor from "react-ace";

import "./AceEditorInput.less";

function AceEditorInput(props, ref) {
  return (
    <div className="ace-editor-input">
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
