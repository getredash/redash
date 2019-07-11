import React from 'react';
import AceEditor from 'react-ace';

import './AceEditorInput.less';

// eslint-disable-next-line react/prefer-stateless-function
class AceEditorInput extends React.Component {
  render() {
    return (
      <div className="ace-editor-input">
        <AceEditor
          mode="sql"
          theme="textmate"
          height="100px"
          editorProps={{ $blockScrolling: Infinity }}
          {...this.props}
        />
      </div>
    );
  }
}

export default AceEditorInput;
