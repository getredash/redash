import { isString, isObject, isFinite, isNumber, merge } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import * as Grid from 'antd/lib/grid';

function toNumber(value) {
  value = isNumber(value) ? value : parseFloat(value);
  return isFinite(value) ? value : null;
}

export default function AxisSettings({ id, options, features, onChange }) {
  function optionsChanged(newOptions) {
    onChange(merge({}, options, newOptions));
  }

  function handleNameChange(event) {
    const text = event.target.value;
    const title = isString(text) && (text !== '') ? { text } : null;
    optionsChanged({ title });
  }

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor={`chart-editor-${id}-type`}>Scale</label>
        <Select
          id={`chart-editor-${id}-type`}
          className="w-100"
          data-test={`Chart.${id}.Type`}
          defaultValue={options.type}
          onChange={type => optionsChanged({ type })}
        >
          {features.autoDetectType && <Select.Option value="-">Auto Detect</Select.Option>}
          <Select.Option value="datetime">Datetime</Select.Option>
          <Select.Option value="linear">Linear</Select.Option>
          <Select.Option value="logarithmic">Logarithmic</Select.Option>
          <Select.Option value="category">Category</Select.Option>
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor={`chart-editor-${id}-name`}>Name</label>
        <Input
          id={`chart-editor-${id}-name`}
          data-test={`Chart.${id}.Name`}
          defaultValue={isObject(options.title) ? options.title.text : null}
          onChange={handleNameChange}
        />
      </div>

      {features.range && (
        <Grid.Row gutter={15} type="flex" align="middle" className="m-b-15">
          <Grid.Col span={12}>
            <label htmlFor={`chart-editor-${id}-range-min`}>Min Value</label>
            <InputNumber
              id={`chart-editor-${id}-range-min`}
              className="w-100"
              placeholder="Auto"
              data-test={`Chart.${id}.RangeMin`}
              defaultValue={toNumber(options.rangeMin)}
              onChange={value => optionsChanged({ rangeMin: toNumber(value) })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <label htmlFor={`chart-editor-${id}-range-max`}>Max Value</label>
            <InputNumber
              id={`chart-editor-${id}-range-max`}
              className="w-100"
              placeholder="Auto"
              data-test={`Chart.${id}.RangeMax`}
              defaultValue={toNumber(options.rangeMax)}
              onChange={value => optionsChanged({ rangeMax: toNumber(value) })}
            />
          </Grid.Col>
        </Grid.Row>
      )}
    </React.Fragment>
  );
}

AxisSettings.propTypes = {
  id: PropTypes.string.isRequired,
  options: PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.shape({
      text: PropTypes.string,
    }),
    rangeMin: PropTypes.number,
    rangeMax: PropTypes.number,
  }).isRequired,
  features: PropTypes.shape({
    autoDetectType: PropTypes.bool,
    range: PropTypes.bool,
  }),
  onChange: PropTypes.func,
};

AxisSettings.defaultProps = {
  features: {},
  onChange: () => {},
};
