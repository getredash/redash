import React from 'react';
import PropTypes from 'prop-types';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import { createNumberFormatter } from '@/lib/value-format';

function Editor({ column, onChange }) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-number-format`}>
          Number format
          <Popover
            content={(
              <React.Fragment>
                Format&nbsp;
                <a href="https://redash.io/help/user-guide/visualizations/formatting-numbers" target="_blank" rel="noopener noreferrer">specs.</a>
              </React.Fragment>
            )}
          >
            <Icon className="m-l-5" type="question-circle" theme="filled" />
          </Popover>
        </label>
        <Input
          id={`table-column-editor-${column.name}-number-format`}
          data-test="Table.ColumnEditor.Number.Format"
          defaultValue={column.numberFormat}
          onChange={event => onChangeDebounced({ numberFormat: event.target.value })}
        />
      </div>
    </React.Fragment>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    numberFormat: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initNumberColumn(column) {
  const format = createNumberFormatter(column.numberFormat);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function NumberColumn({ row }) { // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  NumberColumn.prepareData = prepareData;

  return NumberColumn;
}

initNumberColumn.friendlyName = 'Number';
initNumberColumn.Editor = Editor;
