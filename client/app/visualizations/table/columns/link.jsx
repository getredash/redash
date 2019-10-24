import { extend, trim } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import { formatSimpleTemplate } from '@/lib/value-format';

function Editor({ column, onChange }) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-link-url`}>URL template</label>
        <Input
          id={`table-column-editor-${column.name}-link-url`}
          data-test="Table.ColumnEditor.Link.UrlTemplate"
          defaultValue={column.linkUrlTemplate}
          onChange={event => onChangeDebounced({ linkUrlTemplate: event.target.value })}
        />
      </div>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-link-text`}>Text template</label>
        <Input
          id={`table-column-editor-${column.name}-link-text`}
          data-test="Table.ColumnEditor.Link.TextTemplate"
          defaultValue={column.linkTextTemplate}
          onChange={event => onChangeDebounced({ linkTextTemplate: event.target.value })}
        />
      </div>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-link-title`}>Title template</label>
        <Input
          id={`table-column-editor-${column.name}-link-title`}
          data-test="Table.ColumnEditor.Link.TitleTemplate"
          defaultValue={column.linkTitleTemplate}
          onChange={event => onChangeDebounced({ linkTitleTemplate: event.target.value })}
        />
      </div>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-link-open-in-new-tab`}>
          <Checkbox
            id={`table-column-editor-${column.name}-link-open-in-new-tab`}
            data-test="Table.ColumnEditor.Link.OpenInNewTab"
            checked={column.linkOpenInNewTab}
            onChange={event => onChange({ linkOpenInNewTab: event.target.checked })}
          />
          <span>Open in new tab</span>
        </label>
      </div>

      <div className="m-b-15">
        <Popover
          content={(
            <React.Fragment>
              <div>All columns can be referenced using <code>{'{{ column_name }}'}</code> syntax.</div>
              <div>Use <code>{'{{ @ }}'}</code> to reference current (this) column.</div>
              <div>This syntax is applicable to URL, Text and Title options.</div>
            </React.Fragment>
          )}
          placement="topLeft"
          arrowPointAtCenter
        >
          <span style={{ cursor: 'default' }}>
            Format specs <Icon className="m-l-5" type="question-circle" theme="filled" />
          </span>
        </Popover>
      </div>
    </React.Fragment>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    linkUrlTemplate: PropTypes.string,
    linkTextTemplate: PropTypes.string,
    linkTitleTemplate: PropTypes.string,
    linkOpenInNewTab: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initLinkColumn(column) {
  function prepareData(row) {
    row = extend({ '@': row[column.name] }, row);

    const href = trim(formatSimpleTemplate(column.linkUrlTemplate, row));
    if (href === '') {
      return {};
    }

    const title = trim(formatSimpleTemplate(column.linkTitleTemplate, row));
    const text = trim(formatSimpleTemplate(column.linkTextTemplate, row));

    const result = {
      href,
      text: text !== '' ? text : href,
    };

    if (title !== '') {
      result.title = title;
    }
    if (column.linkOpenInNewTab) {
      result.target = '_blank';
    }

    return result;
  }

  function LinkColumn({ row }) { // eslint-disable-line react/prop-types
    const { text, ...props } = prepareData(row);
    return <a {...props}>{text}</a>;
  }

  LinkColumn.prepareData = prepareData;

  return LinkColumn;
}

initLinkColumn.friendlyName = 'Link';
initLinkColumn.Editor = Editor;
