import { extend, trim } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import { formatSimpleTemplate } from '@/lib/value-format';

function Editor({ column, onChange }) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-image-url`}>URL template</label>
        <Input
          id={`table-column-editor-${column.name}-image-url`}
          data-test="Table.ColumnEditor.Image.UrlTemplate"
          defaultValue={column.imageUrlTemplate}
          onChange={event => onChangeDebounced({ imageUrlTemplate: event.target.value })}
        />
      </div>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-image-width`}>
          Size
          <Popover
            content="Any positive integer value that specifies size in pixels. Leave empty to use default value."
            placement="topLeft"
            arrowPointAtCenter
          >
            <Icon className="m-l-5" type="question-circle" theme="filled" />
          </Popover>
        </label>
        <div className="d-flex align-items-center">
          <Input
            id={`table-column-editor-${column.name}-image-width`}
            data-test="Table.ColumnEditor.Image.Width"
            placeholder="Width"
            defaultValue={column.imageWidth}
            onChange={event => onChangeDebounced({ imageWidth: event.target.value })}
          />
          <span className="p-l-5 p-r-5">&times;</span>
          <Input
            id={`table-column-editor-${column.name}-image-height`}
            data-test="Table.ColumnEditor.Image.Height"
            placeholder="Height"
            defaultValue={column.imageHeight}
            onChange={event => onChangeDebounced({ imageHeight: event.target.value })}
          />
        </div>
      </div>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-image-title`}>Title template</label>
        <Input
          id={`table-column-editor-${column.name}-image-title`}
          data-test="Table.ColumnEditor.Image.TitleTemplate"
          defaultValue={column.imageTitleTemplate}
          onChange={event => onChangeDebounced({ imageTitleTemplate: event.target.value })}
        />
      </div>

      <div className="m-b-15">
        <Popover
          content={(
            <React.Fragment>
              <div>All columns can be referenced using <code>{'{{ column_name }}'}</code> syntax.</div>
              <div>Use <code>{'{{ @ }}'}</code> to reference current (this) column.</div>
              <div>This syntax is applicable to URL, Title and Size options.</div>
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
    imageUrlTemplate: PropTypes.string,
    imageWidth: PropTypes.string,
    imageHeight: PropTypes.string,
    imageTitleTemplate: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initImageColumn(column) {
  function prepareData(row) {
    row = extend({ '@': row[column.name] }, row);

    const src = trim(formatSimpleTemplate(column.imageUrlTemplate, row));
    if (src === '') {
      return {};
    }

    const width = parseInt(formatSimpleTemplate(column.imageWidth, row), 10);
    const height = parseInt(formatSimpleTemplate(column.imageHeight, row), 10);
    const title = trim(formatSimpleTemplate(column.imageTitleTemplate, row));

    const result = { src };

    if (Number.isFinite(width) && (width > 0)) {
      result.width = width;
    }
    if (Number.isFinite(height) && (height > 0)) {
      result.height = height;
    }
    if (title !== '') {
      result.text = title; // `text` is used for search
      result.title = title;
      result.alt = title;
    }

    return result;
  }

  function ImageColumn({ row }) { // eslint-disable-line react/prop-types
    const { text, ...props } = prepareData(row);
    return <img alt="" {...props} />;
  }

  ImageColumn.prepareData = prepareData;

  return ImageColumn;
}

initImageColumn.friendlyName = 'Image';
initImageColumn.Editor = Editor;
