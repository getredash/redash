import { map } from "lodash";
import React from "react";
import Collapse from "antd/lib/collapse";
import Tooltip from "antd/lib/tooltip";
import Typography from "antd/lib/typography";
// @ts-expect-error ts-migrate(2724) FIXME: Module '"../../../../node_modules/react-sortable-h... Remove this comment to see the full error message
import { sortableElement } from "react-sortable-hoc";
import { SortableContainer, DragHandle } from "@/components/sortable";
import PropTypes from "prop-types";

import EyeOutlinedIcon from "@ant-design/icons/EyeOutlined";
import EyeInvisibleOutlinedIcon from "@ant-design/icons/EyeInvisibleOutlined";

import ColumnEditor from "./ColumnEditor";

const { Text } = Typography;

const SortableItem = sortableElement(Collapse.Panel);

type ColumnsSettingsProps = {
  options: any;
  onOptionsChange: any;
  variant: "table" | "details";
};

export default function ColumnsSettings({ options, onOptionsChange, variant }: ColumnsSettingsProps) {
  function handleColumnChange(newColumn: any, event: any) {
    if (event) {
      event.stopPropagation();
    }
    const columns = map(options.columns, c => (c.name === newColumn.name ? newColumn : c));
    onOptionsChange({ columns });
  }

  function handleColumnsReorder({ oldIndex, newIndex }: any) {
    const columns = [...options.columns];
    columns.splice(newIndex, 0, ...columns.splice(oldIndex, 1));
    onOptionsChange({ columns });
  }

  const helperClass = `${variant}-editor-columns-dragged-item`;
  const containerClass = `${variant}-visualization-editor-columns`;
  const testPrefix = variant === "table" ? "Table" : "Details";

  return (
    <SortableContainer
      axis="y"
      lockAxis="y"
      useDragHandle
      helperClass={helperClass}
      helperContainer={(container: any) => container.firstChild}
      onSortEnd={handleColumnsReorder}
      containerProps={{
        className: containerClass,
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
                <span data-test={`${testPrefix}.Column.${column.name}.Name`}>
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
                    data-test={`${testPrefix}.Column.${column.name}.Visibility`}
                    onClick={event => handleColumnChange({ ...column, visible: !column.visible }, event)}
                  />
                ) : (
                  <EyeInvisibleOutlinedIcon
                    data-test={`${testPrefix}.Column.${column.name}.Visibility`}
                    onClick={event => handleColumnChange({ ...column, visible: !column.visible }, event)}
                  />
                )}
              </Tooltip>
            }>
            <ColumnEditor column={column} variant={variant} onChange={(changes) => handleColumnChange(changes, undefined)} />
          </SortableItem>
        ))}
      </Collapse>
    </SortableContainer>
  );
}

ColumnsSettings.propTypes = {
  options: PropTypes.object.isRequired,
  onOptionsChange: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["table", "details"]).isRequired,
};
