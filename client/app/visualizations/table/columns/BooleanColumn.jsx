import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { createBooleanFormatter } from '@/lib/value-format';

export default function BooleanColumn({ column, row }) {
  const value = row[column.name];

  const format = useMemo(
    () => createBooleanFormatter(column.booleanValues),
    [column.booleanValues],
  );

  return (
    <span>{format(value)}</span>
  );
}

BooleanColumn.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    booleanValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

BooleanColumn.defaultProps = {
  row: {},
};
