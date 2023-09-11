import { isArray, map, includes, each, difference } from "lodash";
import React, { useMemo } from "react";
import { UpdateOptionsStrategy } from "@/components/visualizations/editor/createTabbedEditor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import ColumnMappingSelect from "./ColumnMappingSelect";

function getMappedColumns(options: any, availableColumns: any) {
  const mappedColumns = {};
  const availableTypes = ["x", "y"];
  each(availableTypes, type => {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    mappedColumns[type] = null;
  });

  availableColumns = map(availableColumns, c => c.name);
  const usedColumns: any = [];

  each(options.columnMapping, (type, column) => {
    if (includes(availableColumns, column) && includes(availableTypes, type)) {
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      mappedColumns[type] = column;

      usedColumns.push(column);
    }
  });

  return {
    mappedColumns,
    unusedColumns: difference(availableColumns, usedColumns),
  };
}

function mappedColumnsToColumnMappings(mappedColumns: any) {
  const result = {};
  each(mappedColumns, (value, type) => {
    if (isArray(value)) {
      each(value, v => {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        result[v] = type;
      });
    } else {
      if (value) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        result[value] = type;
      }
    }
  });
  return result;
}

export default function GeneralSettings({ options, data, onOptionsChange }: any) {
  const { mappedColumns, unusedColumns } = useMemo(() => getMappedColumns(options, data.columns), [
    options,
    data.columns,
  ]);

  function handleColumnMappingChange(column: any, type: any) {
    const columnMapping = mappedColumnsToColumnMappings({
      ...mappedColumns,
      [type]: column,
    });
    onOptionsChange({ columnMapping }, UpdateOptionsStrategy.shallowMerge);
  }

  return (
    <React.Fragment>
      {map(mappedColumns, (value, type) => (
        <ColumnMappingSelect
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          key={type}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          type={type}
          value={value}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'unknown[]' is not assignable to type 'never'... Remove this comment to see the full error message
          availableColumns={unusedColumns}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(column: any, type: any) => void' is not ass... Remove this comment to see the full error message
          onChange={handleColumnMappingChange}
        />
      ))}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
