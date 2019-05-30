import { map } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import { EditorPropTypes } from '@/visualizations';

const { Option } = Select;

export default function Editor({ options, data, onOptionsChange }) {
  const onColumnChanged = (column) => {
    const newOptions = { ...options, column };
    onOptionsChange(newOptions);
  };

  return (
    <div className="form-group">
      <label className="control-label" htmlFor="word-cloud-column">Word Cloud Column Name</label>
      <Select
        id="word-cloud-column"
        className="w-100"
        value={options.column}
        onChange={onColumnChanged}
      >
        {map(data.columns, ({ name }) => (
          <Option key={name}>{name}</Option>
        ))}
      </Select>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
