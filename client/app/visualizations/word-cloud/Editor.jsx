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
    <div className="form-horizontal">
      <div className="form-group d-flex align-items-center">
        <label className="col-lg-6" htmlFor="word-cloud-column">Word Cloud Column Name</label>
        <div className="col-lg-6">
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
      </div>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
