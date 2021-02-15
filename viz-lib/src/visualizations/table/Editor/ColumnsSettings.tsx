import { map } from "lodash";
import React from "react";
import Collapse from "antd/lib/collapse";
import Tooltip from "antd/lib/tooltip";
import Typography from "antd/lib/typography";
// @ts-expect-error ts-migrate(2724) FIXME: Module '"../../../../node_modules/react-sortable-h... Remove this comment to see the full error message
import { sortableElement } from "react-sortable-hoc";
import { SortableContainer, DragHandle } from "@/components/sortable";
import { EditorPropTypes } from "@/visualizations/prop-types";

import EyeOutlinedIcon from "@ant-design/icons/EyeOutlined";
import EyeInvisibleOutlinedIcon from "@ant-design/icons/EyeInvisibleOutlined";

import ColumnEditor from "./ColumnEditor";

const { Text } = Typography;

const SortableItem = sortableElement(Collapse.Panel);

export default function ColumnsSettings({
  options,
  onOptionsChange
}: any) {
  function handleColumnChange(newColumn: any, event: any) {
    if (event) {
      event.stopPropagation();
    }
    const columns = map(options.columns, c => (c.name === newColumn.name ? newColumn : c));
    onOptionsChange({ columns });
  }

  function handleColumnsReorder({
    oldIndex,
    newIndex
  }: any) {
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
      helperContainer={(container: any) => container.firstChild}
      onSortEnd={handleColumnsReorder}
      containerProps={{
        className: "table-visualization-editor-columns",
      }}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
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
                    <Text type="secondary" style={{ marginLeft: 5 }}>
                      <i>({column.title})</i>
                    </Text>
                  )}
                </span>
              </React.Fragment>
            }
            extra={
              <Tooltip title="Toggle visibility" mouseEnterDelay={0} mouseLeaveDelay={0}>
                {column.visible ? (
                  <EyeOutlinedIcon
                    data-test={`Table.Column.${column.name}.Visibility`}
                    onClick={event => handleColumnChange({ ...column, visible: !column.visible }, event)}
                  />
                ) : (
                  <EyeInvisibleOutlinedIcon
                    data-test={`Table.Column.${column.name}.Visibility`}
                    onClick={event => handleColumnChange({ ...column, visible: !column.visible }, event)}
                  />
                )}
              </Tooltip>
            }>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(newColumn: any, event: any) => void' is not... Remove this comment to see the full error message */}
            <ColumnEditor column={column} onChange={handleColumnChange} />
          </SortableItem>
        ))}
      </Collapse>
    </SortableContainer>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
