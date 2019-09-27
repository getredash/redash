import { map, some } from 'lodash';
import React, { useRef } from 'react';
import { sortableContainer, sortableElement } from 'react-sortable-hoc';
import { EditorPropTypes } from '@/visualizations';

import ColumnEditor from './ColumnEditor';

const SortableContainer = sortableContainer(({ children }) => children);
const SortableItem = sortableElement(({ children }) => children);

function shouldCancelDragStart(event) {
  const cx = event.target.classList;
  const allowDnD = some(
    ['table-visualization-editor-column', 'table-visualization-editor-column-header'],
    c => cx.contains(c),
  );
  return !allowDnD;
}

export default function ColumnsSettings({ options, onOptionsChange }) {
  const containerRef = useRef();

  function handleColumnChange(newColumn) {
    const columns = map(options.columns, c => (c.name === newColumn.name ? newColumn : c));
    onOptionsChange({ columns });
  }

  function handleColumnsReorder({ oldIndex, newIndex }) {
    const columns = [...options.columns];
    columns.splice(newIndex, 0, ...columns.splice(oldIndex, 1));
    onOptionsChange({ columns });
  }

  return (
    <SortableContainer
      axis="x"
      lockAxis="x"
      helperContainer={() => containerRef.current}
      shouldCancelStart={shouldCancelDragStart}
      onSortEnd={handleColumnsReorder}
    >
      <div ref={containerRef} className="table-visualization-editor-columns">
        {map(options.columns, (column, index) => (
          <SortableItem key={column.name} index={index}>
            <ColumnEditor column={column} onChange={handleColumnChange} />
          </SortableItem>
        ))}
      </div>
    </SortableContainer>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
