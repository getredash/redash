import { map } from 'lodash';
import React, { useRef } from 'react';
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import Collapse from 'antd/lib/collapse';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';
import Typography from 'antd/lib/typography';
import { EditorPropTypes } from '@/visualizations';

import ColumnEditor from './ColumnEditor';

const { Text } = Typography;

const SortableContainer = sortableContainer(props => <div {...props} />);
const SortableItem = sortableElement(Collapse.Panel);
const DragHandle = sortableHandle(() => <div className="drag-handle" />);

export default function ColumnsSettings({ options, onOptionsChange }) {
  const containerRef = useRef();

  function handleColumnChange(newColumn, event) {
    if (event) {
      event.stopPropagation();
    }
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
      axis="y"
      lockAxis="y"
      useDragHandle
      helperContainer={() => containerRef.current.firstChild}
      onSortEnd={handleColumnsReorder}
    >
      <div ref={containerRef} className="table-visualization-editor-columns">
        <Collapse bordered={false} defaultActiveKey={[]} expandIconPosition="right">
          {map(options.columns, (column, index) => (
            <SortableItem
              key={column.name}
              index={index}
              header={(
                <React.Fragment>
                  <DragHandle />
                  {column.name}
                  {(column.title !== '') && (column.title !== column.name) && (
                    <Text type="secondary" className="m-l-5"><i>({column.title})</i></Text>
                  )}
                </React.Fragment>
              )}
              extra={(
                <Tooltip title="Toggle visibility" mouseEnterDelay={0} mouseLeaveDelay={0}>
                  <Icon
                    type={column.visible ? 'eye' : 'eye-invisible'}
                    onClick={event => handleColumnChange({ ...column, visible: !column.visible }, event)}
                  />
                </Tooltip>
              )}
            >
              <ColumnEditor column={column} onChange={handleColumnChange} />
            </SortableItem>
          ))}
        </Collapse>
      </div>
    </SortableContainer>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
