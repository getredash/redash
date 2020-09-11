import { find, extend, includes, isEqual } from "lodash";
import React from "react";
import Tabs from "antd/lib/tabs";
import { EditorPropTypes } from "@/visualizations";
import { getColumnCleanName } from "@/services/query-result";

import GeneralSettings from "./GeneralSettings";
import ColumnSettings from "./ColumnSettings";

const displayAs = {
  integer: "number",
  float: "number",
  boolean: "boolean",
  date: "datetime",
  timestamp: "datetime",
  datetime: "datetime",
};

function getColumnContentAlignment(type) {
  return ["integer", "float", "boolean", "date", "datetime"].indexOf(type) >= 0
    ? "right"
    : "left";
}

function getDefaultColumnSettings(
  tableColumns,
  dataColumns,
  specialColumns,
  optionsChanged
) {
  const result = {};
  const dataColumnNames = dataColumns.map((col) => col.name);
  tableColumns.forEach((col) => {
    const columnType = includes(dataColumnNames, col)
      ? find(dataColumns, (c) => c.name === col).type
      : "string";
    result[col] = {
      name: col,
      type: columnType,
      table: true,
      format: displayAs[columnType] || "string",
      edit: !(includes(specialColumns, col) || !includes(dataColumnNames, col)),
      hide: !includes(dataColumnNames, col),
      default: null,
      title: getColumnCleanName(col),
      dataIndex: getColumnCleanName(col),
      alignContent: getColumnContentAlignment(columnType),
    };
  });
  dataColumns.forEach((col) => {
    if (!includes(tableColumns, col.name)) {
      result[col.name] = {
        name: col.name,
        type: col.type,
        table: false,
        format: displayAs[col.type] || "string",
        edit: false,
        hide: false,
        default: null,
        title: getColumnCleanName(col.name),
        dataIndex: getColumnCleanName(col.name),
        alignContent: getColumnContentAlignment(col.type),
      };
    }
  });
  optionsChanged({ columns: result });
}

export default function Editor(props) {
  const { options, onOptionsChange, schema, data, dataSourceId } = props;

  const tableColumns = options.editTable
    ? find(schema, (t) => t.name === options.editTable).columns
    : [];
  const commonColumns = tableColumns
    ? data.columns.filter((c) => includes(tableColumns, c.name))
    : [];
  const specialColumns = [
    options.primaryKey,
    options.modifiedBy,
    options.updatedAt,
    options.startTime,
    options.endTime,
  ];

  const optionsChanged = (newOptions) => {
    onOptionsChange(extend({}, options, newOptions));
  };

  if (options.editTable && (!options.columns || isEqual(options.columns, {}))) {
    getDefaultColumnSettings(
      tableColumns,
      data.columns,
      specialColumns,
      optionsChanged
    );
  }

  if (!options.dataSourceId || options.dataSourceId !== dataSourceId) {
    optionsChanged({ dataSourceId });
  }

  return (
    <Tabs animated={false} tabBarGutter={0}>
      <Tabs.TabPane
        key="general"
        tab={<span data-test="EditGrid.EditorTabs.General">General</span>}
      >
        <GeneralSettings
          {...props}
          onOptionsChange={optionsChanged}
          tableColumns={tableColumns}
          commonColumns={commonColumns}
        />
      </Tabs.TabPane>
      <Tabs.TabPane
        key="column"
        disabled={!options.editTable}
        tab={<span data-test="EditGrid.EditorTabs.Columns">Columns</span>}
      >
        <ColumnSettings
          {...props}
          onOptionsChange={optionsChanged}
          tableColumns={tableColumns}
          commonColumns={commonColumns}
          specialColumns={specialColumns}
        />
      </Tabs.TabPane>
    </Tabs>
  );
}

Editor.propTypes = EditorPropTypes;
