import { map } from "lodash";
import React from "react";
import { Section, Select, Input, InputNumber, Checkbox } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function GeneralSettings({ options, data, visualizationName, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <Input
          layout="horizontal"
          label="Counter Label"
          className="w-100"
          data-test="Counter.General.Label"
          defaultValue={options.counterLabel}
          placeholder={visualizationName}
          onChange={e => onOptionsChange({ counterLabel: e.target.value })}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Counter Value Column Name"
          className="w-100"
          data-test="Counter.General.ValueColumn"
          defaultValue={options.counterColName}
          disabled={options.countRow}
          onChange={counterColName => onOptionsChange({ counterColName })}>
          {map(data.columns, col => (
            <Select.Option key={col.name} data-test={"Counter.General.ValueColumn." + col.name}>
              {col.name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Counter Value Row Number"
          className="w-100"
          data-test="Counter.General.ValueRowNumber"
          defaultValue={options.rowNumber}
          disabled={options.countRow}
          onChange={rowNumber => onOptionsChange({ rowNumber })}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Target Value Column Name"
          className="w-100"
          data-test="Counter.General.TargetValueColumn"
          defaultValue={options.targetColName}
          onChange={targetColName => onOptionsChange({ targetColName })}>
          <Select.Option value="">No target value</Select.Option>
          {map(data.columns, col => (
            <Select.Option key={col.name} data-test={"Counter.General.TargetValueColumn." + col.name}>
              {col.name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Target Value Row Number"
          className="w-100"
          data-test="Counter.General.TargetValueRowNumber"
          defaultValue={options.targetRowNumber}
          onChange={targetRowNumber => onOptionsChange({ targetRowNumber })}
        />
      </Section>

      <Section>
        <Checkbox
          data-test="Counter.General.CountRows"
          checked={options.countRow}
          onChange={event => onOptionsChange({ countRow: event.target.checked })}>
          Count Rows
        </Checkbox>
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
