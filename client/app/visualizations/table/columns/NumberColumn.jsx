import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { createNumberFormatter } from '@/lib/value-format';

export default function NumberColumn({ column, row }) {
  const value = row[column.name];

  const format = useMemo(
    () => createNumberFormatter(column.numberFormat),
    [column.numberFormat],
  );

  return (
    <span>{format(value)}</span>
  );
}

NumberColumn.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    numberFormat: PropTypes.string.isRequired,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

NumberColumn.defaultProps = {
  row: {},
};
