import { map, keys, includes, get } from "lodash";
import React from "react";
import { Section, Select, Input, InputNumber } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { COUNTER_TYPES } from "../utils";

export default function GeneralSettings({ options, data, visualizationName, onOptionsChange }) {
  const showOptionForType = option => includes(get(COUNTER_TYPES[options.counterType], "options"), option);
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
          label="Counter Type"
          id="counter-value-column"
          className="w-100"
          data-test="Counter.General.Type"
          value={options.counterType}
          onChange={counterType => onOptionsChange({ counterType })}>
          {map(keys(COUNTER_TYPES), type => (
            <Select.Option key={type} data-test={"Counter.General.Type." + type}>
              {COUNTER_TYPES[type].name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {showOptionForType("counterColName") && (
        <Section>
          <Select
            layout="horizontal"
            label="Counter Value Column Name"
            className="w-100"
            data-test="Counter.General.ValueColumn"
            defaultValue={options.counterColName}
            onChange={counterColName => onOptionsChange({ counterColName })}>
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={"Counter.General.ValueColumn." + col.name}>
                {col.name}
              </Select.Option>
            ))}
          </Select>
        </Section>
      )}

      {showOptionForType("rowNumber") && (
        <Section>
          <InputNumber
            layout="horizontal"
            label="Counter Value Row Number"
            className="w-100"
            data-test="Counter.General.ValueRowNumber"
            defaultValue={options.rowNumber}
            onChange={rowNumber => onOptionsChange({ rowNumber })}
          />
        </Section>
      )}

      {showOptionForType("targetColName") && (
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
      )}

      {showOptionForType("TargetValueRowNumber") && (
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
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
