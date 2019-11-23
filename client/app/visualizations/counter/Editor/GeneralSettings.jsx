import { map, keys, includes, get } from 'lodash';
import React from 'react';
import * as Grid from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import { EditorPropTypes } from '@/visualizations';
import { COUNTER_TYPES } from '../utils';

export default function GeneralSettings({ options, data, visualizationName, onOptionsChange }) {
  const showOptionForType = option => includes(get(COUNTER_TYPES[options.counterType], 'options'), option);
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
          <label htmlFor="counter-type">Counter Type</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="counter-value-column"
            className="w-100"
            data-test="Counter.General.Type"
            value={options.counterType}
            onChange={counterType => onOptionsChange({ counterType })}
          >
            {map(keys(COUNTER_TYPES), type => (
              <Select.Option key={type} data-test={'Counter.General.Type.' + type}>{COUNTER_TYPES[type].name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      {showOptionForType('counterColName') && (
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
      )}

      {showOptionForType('rowNumber') && (
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
      )}

      {showOptionForType('targetColName') && (
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
      )}

      {showOptionForType('targetRowNumber') && (
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
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
