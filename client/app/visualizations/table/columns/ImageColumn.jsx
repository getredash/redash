import { extend, trim } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { formatSimpleTemplate } from '@/lib/value-format';

export default function ImageColumn({ column, row }) {
  row = extend({ '@': row[column.name] }, row);

  const url = trim(formatSimpleTemplate(column.imageUrlTemplate, row));
  if (url === '') {
    return null;
  }

  const width = parseInt(formatSimpleTemplate(column.imageWidth, row), 10);
  const height = parseInt(formatSimpleTemplate(column.imageHeight, row), 10);
  const title = trim(formatSimpleTemplate(column.imageTitleTemplate, row));

  const props = { };

  if (Number.isFinite(width) && (width > 0)) {
    props.width = width;
  }
  if (Number.isFinite(height) && (height > 0)) {
    props.height = height;
  }
  if (title !== '') {
    props.title = title;
    props.alt = title;
  }

  return (<img alt="" src={url} {...props} />);
}

ImageColumn.propTypes = {
  column: PropTypes.shape({
    imageUrlTemplate: PropTypes.string.isRequired,
    imageWidth: PropTypes.string.isRequired,
    imageHeight: PropTypes.string.isRequired,
    imageTitleTemplate: PropTypes.string.isRequired,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

ImageColumn.defaultProps = {
  row: {},
};
