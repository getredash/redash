import { isString, isUndefined } from "lodash";
import React from "react";
import JsonViewInteractive from "@/components/json-view-interactive/JsonViewInteractive";
import { clientConfig } from "@/services/auth";

export default function initJsonColumn(column) {
  function prepareData(row) {
    const text = row[column.name];
    if (isString(text) && text.length <= clientConfig.tableCellMaxJSONSize) {
      try {
        return { text, value: JSON.parse(text) };
      } catch (e) {
        // ignore `JSON.parse` error and return default value
      }
    }
    return { text, value: undefined };
  }

  function JsonColumn({ row }) {
    // eslint-disable-line react/prop-types
    const { text, value } = prepareData(row);
    if (isUndefined(value)) {
      return <div className="json-cell-invalid">{"" + text}</div>;
    }

    return (
      <div className="json-cell-valid">
        <JsonViewInteractive value={value} />
      </div>
    );
  }

  JsonColumn.prepareData = prepareData;

  return JsonColumn;
}

initJsonColumn.friendlyName = "JSON";
