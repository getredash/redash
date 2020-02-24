import React from 'react';
import * as Grid from 'antd/lib/grid';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

import { isValueNumber } from '../utils';

export default function FormatSettings({ options, data, onOptionsChange }) {
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
