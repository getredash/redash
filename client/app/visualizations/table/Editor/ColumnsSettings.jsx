import { map } from "lodash";
import React from "react";
import Collapse from "antd/lib/collapse";
import Icon from "antd/lib/icon";
import Tooltip from "antd/lib/tooltip";
import Typography from "antd/lib/typography";
import { sortableElement } from "react-sortable-hoc";
import { SortableContainer, DragHandle } from "@/components/sortable";
import { EditorPropTypes } from "@/visualizations";

import ColumnEditor from "./ColumnEditor";

const { Text } = Typography;

const SortableItem = sortableElement(Collapse.Panel);

export default function ColumnsSettings({ options, onOptionsChange }) {
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
      helperClass="table-editor-columns-dragged-item"
      helperContainer={container => container.firstChild}
      onSortEnd={handleColumnsReorder}
      containerProps={{
        className: "table-visualization-editor-columns",
      }}>
      <Collapse bordered={false} defaultActiveKey={[]} expandIconPosition="right">
        {map(options.columns, (column, index) => (
          <SortableItem
            key={column.name}
            index={index}
            header={
              <React.Fragment>
                <DragHandle />
                <span data-test={`Table.Column.${column.name}.Name`}>
                  {column.name}
                  {column.title !== "" && column.title !== column.name && (
                    <Text type="secondary" className="m-l-5">
                      <i>({column.title})</i>
                    </Text>
                  )}
                </span>
              </React.Fragment>
            }
            extra={
              <Tooltip title="Toggle visibility" mouseEnterDelay={0} mouseLeaveDelay={0}>
                <Icon
                  data-test={`Table.Column.${column.name}.Visibility`}
                  type={column.visible ? "eye" : "eye-invisible"}
                  onClick={event => handleColumnChange({ ...column, visible: !column.visible }, event)}
                />
              </Tooltip>
            }>
            <ColumnEditor column={column} onChange={handleColumnChange} />
          </SortableItem>
        ))}
      </Collapse>
    </SortableContainer>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
