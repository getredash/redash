import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { createDateTimeFormatter } from '@/lib/value-format';

export default function DateTimeColumn({ column, row }) {
  const value = row[column.name];

  const format = useMemo(
    () => createDateTimeFormatter(column.dateTimeFormat),
    [column.dateTimeFormat],
  );

  return (
    <span>{format(value)}</span>
  );
}

DateTimeColumn.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    dateTimeFormat: PropTypes.string.isRequired,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

DateTimeColumn.defaultProps = {
  row: {},
};
