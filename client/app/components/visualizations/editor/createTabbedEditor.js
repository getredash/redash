import React from 'react';
import TabbedEditor from './TabbedEditor';

export default function createTabbedEditor(tabs) {
  return function TabbedEditorWrapper(props) {
    return (
      <TabbedEditor {...props} tabs={tabs} />
    );
  };
}
