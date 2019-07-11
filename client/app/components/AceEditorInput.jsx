import React from 'react';
import AceEditor from 'react-ace';

// eslint-disable-next-line react/prefer-stateless-function
class AceEditorInput extends React.Component {
  render() {
    return (
      <AceEditor
        style={{ display: 'inline-block' }}
        mode="sql"
        theme="textmate"
        height="100px"
        editorProps={{ $blockScrolling: Infinity }}
        {...this.props}
      />
    );
  }
}

export default AceEditorInput;
