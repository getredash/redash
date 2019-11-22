import { extend, trim } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import ContextHelp from '@/components/visualizations/editor/ContextHelp';
import Section from '@/components/visualizations/editor/Section';
import { formatSimpleTemplate } from '@/lib/value-format';

function Editor({ column, onChange }) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
    <React.Fragment>
      <Section>
        <label htmlFor={`table-column-editor-${column.name}-link-url`}>URL template</label>
        <Input
          id={`table-column-editor-${column.name}-link-url`}
          data-test="Table.ColumnEditor.Link.UrlTemplate"
          defaultValue={column.linkUrlTemplate}
          onChange={event => onChangeDebounced({ linkUrlTemplate: event.target.value })}
        />
      </Section>

      <Section>
        <label htmlFor={`table-column-editor-${column.name}-link-text`}>Text template</label>
        <Input
          id={`table-column-editor-${column.name}-link-text`}
          data-test="Table.ColumnEditor.Link.TextTemplate"
          defaultValue={column.linkTextTemplate}
          onChange={event => onChangeDebounced({ linkTextTemplate: event.target.value })}
        />
      </Section>

      <Section>
        <label htmlFor={`table-column-editor-${column.name}-link-title`}>Title template</label>
        <Input
          id={`table-column-editor-${column.name}-link-title`}
          data-test="Table.ColumnEditor.Link.TitleTemplate"
          defaultValue={column.linkTitleTemplate}
          onChange={event => onChangeDebounced({ linkTitleTemplate: event.target.value })}
        />
      </Section>

      <Section>
        <Checkbox
          data-test="Table.ColumnEditor.Link.OpenInNewTab"
          checked={column.linkOpenInNewTab}
          onChange={event => onChange({ linkOpenInNewTab: event.target.checked })}
        >
          Open in new tab
        </Checkbox>
      </Section>

      <Section>
        <ContextHelp
          placement="topLeft"
          arrowPointAtCenter
          icon={(
            <span style={{ cursor: 'default' }}>
              Format specs {ContextHelp.defaultIcon}
            </span>
          )}
        >
          <div>All columns can be referenced using <code>{'{{ column_name }}'}</code> syntax.</div>
          <div>Use <code>{'{{ @ }}'}</code> to reference current (this) column.</div>
          <div>This syntax is applicable to URL, Text and Title options.</div>
        </ContextHelp>
      </Section>
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
