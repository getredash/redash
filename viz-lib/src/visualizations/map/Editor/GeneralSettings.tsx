import { isNil, map, filter, difference } from "lodash";
import React, { useMemo } from "react";
import { Section, Select } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

function getColumns(column: any, unusedColumns: any) {
  return filter([column, ...unusedColumns], v => !isNil(v));
}

export default function GeneralSettings({
  options,
  data,
  onOptionsChange
}: any) {
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
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Latitude Column Name"
          data-test="Map.Editor.LatitudeColumnName"
          value={options.latColName}
          onChange={(latColName: any) => onOptionsChange({ latColName })}>
          {map(getColumns(options.latColName, unusedColumns), col => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={col} data-test={"Map.Editor.LatitudeColumnName." + col}>
              {col}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Longitude Column Name"
          data-test="Map.Editor.LongitudeColumnName"
          value={options.lonColName}
          onChange={(lonColName: any) => onOptionsChange({ lonColName })}>
          {map(getColumns(options.lonColName, unusedColumns), col => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={col} data-test={"Map.Editor.LongitudeColumnName." + col}>
              {col}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Group By"
          data-test="Map.Editor.GroupBy"
          allowClear
          placeholder="none"
          value={options.classify || undefined}
          onChange={(column: any) => onOptionsChange({ classify: column || null })}>
          {map(getColumns(options.classify, unusedColumns), col => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={col} data-test={"Map.Editor.GroupBy." + col}>
              {col}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
