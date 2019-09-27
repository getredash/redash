import { map } from 'lodash';
import React from 'react';
import { EditorPropTypes } from '@/visualizations';

import ColumnEditor from './ColumnEditor';

export default function ColumnsSettings({ options, onOptionsChange }) {
  function handleColumnChange(newColumn) {
    const columns = map(options.columns, c => (c.name === newColumn.name ? newColumn : c));
    onOptionsChange({ columns });
  }

  return (
    <div className="table-editor-query-columns">
      {map(options.columns, column => (
        <ColumnEditor key={column.name} column={column} onChange={handleColumnChange} />
      ))}
    </div>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
