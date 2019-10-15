import React from 'react';
import PropTypes from 'prop-types';
import Checkbox from 'antd/lib/checkbox';
import HtmlContent from '@/components/HtmlContent';
import { createTextFormatter } from '@/lib/value-format';

function Editor({ column, onChange }) {
  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-allow-html`}>
          <Checkbox
            id={`table-column-editor-${column.name}-allow-html`}
            data-test="Table.ColumnEditor.Text.AllowHTML"
            checked={column.allowHTML}
            onChange={event => onChange({ allowHTML: event.target.checked })}
          />
          <span>Allow HTML content</span>
        </label>
      </div>

      {column.allowHTML && (
        <div className="m-b-15">
          <label htmlFor={`table-column-editor-${column.name}-highlight-links`}>
            <Checkbox
              id={`table-column-editor-${column.name}-highlight-links`}
              data-test="Table.ColumnEditor.Text.HighlightLinks"
              checked={column.highlightLinks}
              onChange={event => onChange({ highlightLinks: event.target.checked })}
            />
            <span>Highlight links</span>
          </label>
        </div>
      )}
    </React.Fragment>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    allowHTML: PropTypes.bool,
    highlightLinks: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initTextColumn(column) {
  const format = createTextFormatter(column.allowHTML && column.highlightLinks);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function TextColumn({ row }) { // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return column.allowHTML ? <HtmlContent>{text}</HtmlContent> : text;
  }

  TextColumn.prepareData = prepareData;

  return TextColumn;
}

initTextColumn.friendlyName = 'Text';
initTextColumn.Editor = Editor;
