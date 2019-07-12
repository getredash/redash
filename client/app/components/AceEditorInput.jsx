import React, { forwardRef } from 'react';
import AceEditor from 'react-ace';

function AceEditorInput(props, ref) {
  return (
    <div className="ace-editor-input">
      <AceEditor
        ref={ref}
        mode="sql"
        theme="textmate"
        height="100px"
        editorProps={{ $blockScrolling: Infinity }}
        {...props}
      />
    </div>
  );
}

export default forwardRef(AceEditorInput);
