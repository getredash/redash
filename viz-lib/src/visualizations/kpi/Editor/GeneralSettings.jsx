import { map } from "lodash";
import React from "react";
import { Section, Select, Input, InputNumber, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

export default function GeneralSettings({ options, data, visualizationName, onOptionsChange }) {
  return (
    <React.Fragment>

      <Section>
        <Select
          layout="horizontal"
          label="Current Value Column Name"
          defaultValue={options.currentValueColName}
          onChange={currentValueColName => onOptionsChange({ currentValueColName })}>
          {map(data.columns, col => (
            <Select.Option key={col.name}>
              {col.name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Target Value Column Name"
          defaultValue={options.targetValueColName}
          onChange={targetValueColName => onOptionsChange({ targetValueColName })}>
          <Select.Option value="">No target value</Select.Option>
          {map(data.columns, col => (
            <Select.Option key={col.name}>
              {col.name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Target Value Prefix Label"
          placeholder="Current"
          defaultValue={options.targetValuePrefixLabel}
          onChange={e => onOptionsChange({ targetValuePrefixLabel: e.target.value })}
        />
      </Section>

    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
