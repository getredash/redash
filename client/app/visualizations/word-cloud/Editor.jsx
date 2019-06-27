import { map, merge } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, data, onOptionsChange }) {
  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="word-cloud-column">Words Column</label>
        <Select
          id="word-cloud-column"
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
        <label className="control-label" htmlFor="word-cloud-column">Frequencies Column</label>
        <Select
          id="word-cloud-column"
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
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
