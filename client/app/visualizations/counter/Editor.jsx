import { merge, map } from 'lodash';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Switch from 'antd/lib/switch';
import * as Grid from 'antd/lib/grid';
import { EditorPropTypes } from '@/visualizations';

import { isValueNumber } from './utils';

function GeneralSettings({ options, data, visualizationName, onOptionsChange }) {
  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-label">Counter Label</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="counter-label"
            className="w-100"
            data-test="Counter.General.Label"
            defaultValue={options.counterLabel}
            placeholder={visualizationName}
            onChange={e => onOptionsChange({ counterLabel: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-value-column">Counter Value Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="counter-value-column"
            className="w-100"
            data-test="Counter.General.ValueColumn"
            defaultValue={options.counterColName}
            disabled={options.countRow}
            onChange={counterColName => onOptionsChange({ counterColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Counter.General.ValueColumn.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-value-row-number">Counter Value Row Number</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="counter-value-row-number"
            className="w-100"
            data-test="Counter.General.ValueRowNumber"
            defaultValue={options.rowNumber}
            disabled={options.countRow}
            onChange={rowNumber => onOptionsChange({ rowNumber })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-target-value-column">Target Value Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="counter-target-value-column"
            className="w-100"
            data-test="Counter.General.TargetValueColumn"
            defaultValue={options.targetColName}
            onChange={targetColName => onOptionsChange({ targetColName })}
          >
            <Select.Option value="">No target value</Select.Option>
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Counter.General.TargetValueColumn.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-target-row-number">Target Value Row Number</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="counter-target-row-number"
            className="w-100"
            data-test="Counter.General.TargetValueRowNumber"
            defaultValue={options.targetRowNumber}
            onChange={targetRowNumber => onOptionsChange({ targetRowNumber })}
          />
        </Grid.Col>
      </Grid.Row>

      <label className="d-flex align-items-center" htmlFor="counter-count-rows">
        <Switch
          id="counter-count-rows"
          data-test="Counter.General.CountRows"
          defaultChecked={options.countRow}
          onChange={countRow => onOptionsChange({ countRow })}
        />
        <span className="m-l-10">Count Rows</span>
      </label>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;

function FormatSettings({ options, data, onOptionsChange }) {
  const inputsEnabled = isValueNumber(data.rows, options);
  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-formatting-decimal-place">Formatting Decimal Place</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="counter-formatting-decimal-place"
            className="w-100"
            data-test="Counter.Formatting.DecimalPlace"
            defaultValue={options.stringDecimal}
            disabled={!inputsEnabled}
            onChange={stringDecimal => onOptionsChange({ stringDecimal })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-formatting-decimal-character">Formatting Decimal Character</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="counter-formatting-decimal-character"
            className="w-100"
            data-test="Counter.Formatting.DecimalCharacter"
            defaultValue={options.stringDecChar}
            disabled={!inputsEnabled}
            onChange={e => onOptionsChange({ stringDecChar: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-formatting-thousands-separator">Formatting Thousands Separator</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="counter-formatting-thousands-separator"
            className="w-100"
            data-test="Counter.Formatting.ThousandsSeparator"
            defaultValue={options.stringThouSep}
            disabled={!inputsEnabled}
            onChange={e => onOptionsChange({ stringThouSep: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-formatting-string-prefix">Formatting String Prefix</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="counter-formatting-string-prefix"
            className="w-100"
            data-test="Counter.Formatting.StringPrefix"
            defaultValue={options.stringPrefix}
            disabled={!inputsEnabled}
            onChange={e => onOptionsChange({ stringPrefix: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="counter-formatting-string-suffix">Formatting String Suffix</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="counter-formatting-string-suffix"
            className="w-100"
            data-test="Counter.Formatting.StringSuffix"
            defaultValue={options.stringSuffix}
            disabled={!inputsEnabled}
            onChange={e => onOptionsChange({ stringSuffix: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <label className="d-flex align-items-center" htmlFor="counter-format-target-value">
        <Switch
          id="counter-format-target-value"
          data-test="Counter.Formatting.FormatTargetValue"
          defaultChecked={options.formatTargetValue}
          onChange={formatTargetValue => onOptionsChange({ formatTargetValue })}
        />
        <span className="m-l-10">Format Target Value</span>
      </label>
    </React.Fragment>
  );
}

FormatSettings.propTypes = EditorPropTypes;

export default function Editor(props) {
  const { options, onOptionsChange } = props;

  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <Tabs animated={false}>
      <Tabs.TabPane key="general" tab={<span data-test="Counter.EditorTabs.General">General</span>}>
        <GeneralSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
      <Tabs.TabPane key="format" tab={<span data-test="Counter.EditorTabs.Formatting">Format</span>}>
        <FormatSettings {...props} onOptionsChange={optionsChanged} />
      </Tabs.TabPane>
    </Tabs>
  );
}

Editor.propTypes = EditorPropTypes;
