import React from "react";
import Tooltip from "antd/lib/tooltip";
import Typography from "antd/lib/typography";
import { SortableContainer, DragHandle, SortableElement } from "@/components/sortable";
import { EditorPropTypes } from "@/visualizations/prop-types";

import EyeOutlinedIcon from "@ant-design/icons/EyeOutlined";
import EyeInvisibleOutlinedIcon from "@ant-design/icons/EyeInvisibleOutlined";
import RightOutlined from "@ant-design/icons/RightOutlined";

import ColumnEditor from "./ColumnEditor";

const { Text } = Typography;

// Flat sortable item row
const SortableItem = (props: any) => {
  const { column, index, onColumnChange, editingColumn, setEditingColumn } = props;
  return (
    <SortableElement id={column.name} index={index}>
      {({ dragHandleProps }: any) => (
        <div
          className="table-editor-column-row"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: "1px solid #f0f0f0",
            background: "#fff",
            cursor: "grab"
          }}
          data-test={`Table.Column.${column.name}`}
        >
          <DragHandle style={{ marginRight: 16, color: "#bfbfbf", fontSize: 18 }} {...dragHandleProps} />
          <span style={{ flex: 1, fontWeight: 500 }}>{column.name}</span>
          <Tooltip title="Toggle visibility" mouseEnterDelay={0} mouseLeaveDelay={0}>
            {column.visible ? (
              <EyeOutlinedIcon
                style={{ marginRight: 16, fontSize: 16 }}
                data-test={`Table.Column.${column.name}.Visibility`}
                onClick={event => onColumnChange({ ...column, visible: !column.visible }, event)}
              />
            ) : (
              <EyeInvisibleOutlinedIcon
                style={{ marginRight: 16, fontSize: 16 }}
                data-test={`Table.Column.${column.name}.Visibility`}
                onClick={event => onColumnChange({ ...column, visible: !column.visible }, event)}
              />
            )}
          </Tooltip>
          <RightOutlined
            style={{ color: "#bfbfbf", fontSize: 14, cursor: "pointer" }}
            onClick={() =>
              editingColumn && editingColumn.name === column.name
                ? setEditingColumn(null)
                : setEditingColumn(column)
            }
          />
        </div>
      )}
    </SortableElement>
  );
};

export default function ColumnsSettings({ options, onOptionsChange }: any) {
  const [editingColumn, setEditingColumn] = React.useState<any>(null);

  function handleColumnChange(newColumn: any, event?: any) {
    if (event) {
      event.stopPropagation();
    }
    const columns = options.columns.map((c: any) => (c.name === newColumn.name ? newColumn : c));
    onOptionsChange({ columns });
  }

  function handleColumnsReorder({ oldIndex, newIndex }: any) {
    const columns = [...options.columns];
    columns.splice(newIndex, 0, ...columns.splice(oldIndex, 1));
    onOptionsChange({ columns });
  }

  function handleEditColumn(column: any) {
    setEditingColumn(column);
  }

  function handleEditorChange(...args: any[]) {
    handleColumnChange(args[0], undefined);
    setEditingColumn(null);
  }

  return (
    <>
      <SortableContainer
        axis="y"
        lockAxis="y"
        useDragHandle
        helperClass="table-editor-columns-dragged-item"
        helperContainer={(container: any) => container.firstChild}
        onSortEnd={handleColumnsReorder}
        containerProps={{
          className: "table-visualization-editor-columns",
        }}
        disabled={false}
        containerComponent="div"
        items={options.columns.map((col: any) => col.name)}
      >
        {options.columns.map((column: any, index: number) => [
          <SortableItem
            key={column.name}
            column={column}
            index={index}
            onColumnChange={handleColumnChange}
            editingColumn={editingColumn}
            setEditingColumn={setEditingColumn}
          />,
          editingColumn && editingColumn.name === column.name ? (
            <div key={column.name + "-editor"} style={{ marginLeft: 40 }}>
              <ColumnEditor column={editingColumn} onChange={handleEditorChange} />
            </div>
          ) : null
        ])}
      </SortableContainer>
    </>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
