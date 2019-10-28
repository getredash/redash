import React from 'react';
import PropTypes from 'prop-types';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import { createBooleanFormatter } from '@/lib/value-format';

function Editor({ column, onChange }) {
  function handleChange(index, value) {
    const booleanValues = [...column.booleanValues];
    booleanValues.splice(index, 1, value);
    onChange({ booleanValues });
  }

  const [handleChangeDebounced] = useDebouncedCallback(handleChange, 200);

  return (
    <React.Fragment>
      <div className="m-b-15">
        <div className="m-b-15">
          <label htmlFor={`table-column-editor-${column.name}-boolean-false`}>
            Value for <code>false</code>
          </label>
          <Input
            id={`table-column-editor-${column.name}-boolean-false`}
            data-test="Table.ColumnEditor.Boolean.False"
            defaultValue={column.booleanValues[0]}
            onChange={event => handleChangeDebounced(0, event.target.value)}
          />
        </div>
      </div>

      <div className="m-b-15">
        <div className="m-b-15">
          <label htmlFor={`table-column-editor-${column.name}-boolean-true`}>
            Value for <code>true</code>
          </label>
          <Input
            id={`table-column-editor-${column.name}-boolean-true`}
            data-test="Table.ColumnEditor.Boolean.True"
            defaultValue={column.booleanValues[1]}
            onChange={event => handleChangeDebounced(1, event.target.value)}
          />
        </div>
      </div>
    </React.Fragment>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    booleanValues: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initBooleanColumn(column) {
  const format = createBooleanFormatter(column.booleanValues);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function BooleanColumn({ row }) { // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  BooleanColumn.prepareData = prepareData;

  return BooleanColumn;
}

initBooleanColumn.friendlyName = 'Boolean';
initBooleanColumn.Editor = Editor;
