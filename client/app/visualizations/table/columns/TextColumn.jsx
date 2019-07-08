import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import HtmlContent from '@/components/HtmlContent';
import { createTextFormatter } from '@/lib/value-format';

export default function TextColumn({ column, row }) {
  const value = row[column.name];

  const format = useMemo(
    () => createTextFormatter(column.allowHTML && column.highlightLinks),
    [column.allowHTML, column.highlightLinks],
  );

  if (column.allowHTML) {
    return <HtmlContent>{format(value)}</HtmlContent>;
  }

  return value;
}

TextColumn.propTypes = {
  column: PropTypes.shape({
    allowHTML: PropTypes.bool,
    highlightLinks: PropTypes.bool,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

TextColumn.defaultProps = {
  row: {},
};
