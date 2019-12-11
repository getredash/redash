import { isNil, map, filter, difference } from "lodash";
import React, { useMemo } from "react";
import { Section, Select } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

function getColumns(column, unusedColumns) {
  return filter([column, ...unusedColumns], v => !isNil(v));
}

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const unusedColumns = useMemo(
    () =>
      difference(
        map(data.columns, c => c.name),
        [options.latColName, options.lonColName, options.classify]
      ),
    [data, options.latColName, options.lonColName, options.classify]
  );

  return (
    <React.Fragment>
      <Section>
        <Select
          label="Latitude Column Name"
          data-test="Map.Editor.LatitudeColumnName"
          className="w-100"
          value={options.latColName}
          onChange={latColName => onOptionsChange({ latColName })}>
          {map(getColumns(options.latColName, unusedColumns), col => (
            <Select.Option key={col} data-test={"Map.Editor.LatitudeColumnName." + col}>
              {col}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Select
          label="Longitude Column Name"
          data-test="Map.Editor.LongitudeColumnName"
          className="w-100"
          value={options.lonColName}
          onChange={lonColName => onOptionsChange({ lonColName })}>
          {map(getColumns(options.lonColName, unusedColumns), col => (
            <Select.Option key={col} data-test={"Map.Editor.LongitudeColumnName." + col}>
              {col}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Select
          label="Group By"
          data-test="Map.Editor.GroupBy"
          className="w-100"
          allowClear
          placeholder="none"
          value={options.classify || undefined}
          onChange={column => onOptionsChange({ classify: column || null })}>
          {map(getColumns(options.classify, unusedColumns), col => (
            <Select.Option key={col} data-test={"Map.Editor.GroupBy." + col}>
              {col}
            </Select.Option>
          ))}
        </Select>
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
