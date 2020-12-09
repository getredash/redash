import { map } from "lodash";
import React from "react";
import { Section, Select, Input, InputNumber, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function GeneralSettings({
  options,
  data,
  visualizationName,
  onOptionsChange
}: any) {
  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label="Counter Label"
          data-test="Counter.General.Label"
          defaultValue={options.counterLabel}
          placeholder={visualizationName}
          onChange={(e: any) => onOptionsChange({ counterLabel: e.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          layout="horizontal"
          label="Counter Value Column Name"
          data-test="Counter.General.ValueColumn"
          defaultValue={options.counterColName}
          disabled={options.countRow}
          onChange={(counterColName: any) => onOptionsChange({ counterColName })}>
          {map(data.columns, col => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={col.name} data-test={"Counter.General.ValueColumn." + col.name}>
              {col.name}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Counter Value Row Number"
          data-test="Counter.General.ValueRowNumber"
          defaultValue={options.rowNumber}
          disabled={options.countRow}
          onChange={(rowNumber: any) => onOptionsChange({ rowNumber })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          layout="horizontal"
          label="Target Value Column Name"
          data-test="Counter.General.TargetValueColumn"
          defaultValue={options.targetColName}
          onChange={(targetColName: any) => onOptionsChange({ targetColName })}>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="">No target value</Select.Option>
          {map(data.columns, col => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={col.name} data-test={"Counter.General.TargetValueColumn." + col.name}>
              {col.name}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Target Value Row Number"
          data-test="Counter.General.TargetValueRowNumber"
          defaultValue={options.targetRowNumber}
          onChange={(targetRowNumber: any) => onOptionsChange({ targetRowNumber })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          data-test="Counter.General.CountRows"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.countRow}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(countRow: any) => any' is not assignable to... Remove this comment to see the full error message
          onChange={(countRow: any) => onOptionsChange({ countRow })}>
          Count Rows
        </Switch>
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
