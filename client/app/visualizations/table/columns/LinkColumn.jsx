import { extend, trim } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { formatSimpleTemplate } from '@/lib/value-format';

export default function LinkColumn({ column, row }) {
  row = extend({ '@': row[column.name] }, row);

  const url = trim(formatSimpleTemplate(column.linkUrlTemplate, row));
  if (url === '') {
    return null;
  }

  const title = trim(formatSimpleTemplate(column.linkTitleTemplate, row));
  const text = trim(formatSimpleTemplate(column.linkTextTemplate, row));

  const props = { };

  if (title !== '') {
    props.title = title;
  }
  if (column.linkOpenInNewTab) {
    props.target = '_blank';
  }

  return (<a href={url} {...props}>{text !== '' ? text : url}</a>);
}

LinkColumn.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    linkUrlTemplate: PropTypes.string.isRequired,
    linkTitleTemplate: PropTypes.string.isRequired,
    linkTextTemplate: PropTypes.string.isRequired,
    linkOpenInNewTab: PropTypes.bool,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

LinkColumn.defaultProps = {
  row: {},
};
