import React, { forwardRef } from "react";
import AceEditor from "react-ace";
import useAceTheme from "@/lib/hooks/useAceTheme";

import "./AceEditorInput.less";

function AceEditorInput(props, ref) {
  const theme = useAceTheme();
  return (
    <div className="ace-editor-input" data-test={props["data-test"]}>
      <AceEditor
        ref={ref}
        mode="sql"
        theme={theme}
        height="100px"
        editorProps={{ $blockScrolling: Infinity }}
        showPrintMargin={false}
        {...props}
      />
    </div>
  );
}

export default forwardRef(AceEditorInput);
