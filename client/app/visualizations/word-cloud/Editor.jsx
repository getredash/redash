import { map, merge } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import InputNumber from 'antd/lib/input-number';
import * as Grid from 'antd/lib/grid';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, data, onOptionsChange }) {
  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="word-cloud-words-column">Words Column</label>
        <Select
          id="word-cloud-words-column"
          className="w-100"
          value={options.column}
          onChange={column => optionsChanged({ column })}
        >
          {map(data.columns, ({ name }) => (
            <Select.Option key={name}>{name}</Select.Option>
          ))}
        </Select>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="word-cloud-frequencies-column">Frequencies Column</label>
        <Select
          id="word-cloud-frequencies-column"
          className="w-100"
          value={options.frequenciesColumn}
          onChange={frequenciesColumn => optionsChanged({ frequenciesColumn })}
        >
          <Select.Option key="none" value=""><i>(count word frequencies automatically)</i></Select.Option>
          {map(data.columns, ({ name }) => (
            <Select.Option key={'column-' + name} value={name}>{name}</Select.Option>
          ))}
        </Select>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="word-cloud-word-length-limit">
          Words Length Limit
        </label>
        <Grid.Row gutter={15} type="flex">
          <Grid.Col span={12}>
            <InputNumber
              className="w-100"
              placeholder="No Limit"
              min={0}
              value={options.wordLengthLimit.min}
              onChange={value => optionsChanged({ wordLengthLimit: { min: value > 0 ? value : null } })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <InputNumber
              className="w-100"
              placeholder="No Limit"
              min={0}
              value={options.wordLengthLimit.max}
              onChange={value => optionsChanged({ wordLengthLimit: { max: value > 0 ? value : null } })}
            />
          </Grid.Col>
        </Grid.Row>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="word-cloud-word-length-limit">
          Frequencies Limit
        </label>
        <Grid.Row gutter={15} type="flex">
          <Grid.Col span={12}>
            <InputNumber
              className="w-100"
              placeholder="No Limit"
              min={0}
              value={options.wordCountLimit.min}
              onChange={value => optionsChanged({ wordCountLimit: { min: value > 0 ? value : null } })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <InputNumber
              className="w-100"
              placeholder="No Limit"
              min={0}
              value={options.wordCountLimit.max}
              onChange={value => optionsChanged({ wordCountLimit: { max: value > 0 ? value : null } })}
            />
          </Grid.Col>
        </Grid.Row>
      </div>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
