/* eslint-disable react/prop-types */
import { createBooleanFormatter } from '@/lib/value-format';

export default function initBooleanColumn(column) {
  const format = createBooleanFormatter(column.booleanValues);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function BooleanColumn({ row }) {
    const { text } = prepareData(row);
    return text;
  }

  BooleanColumn.prepareData = prepareData;

  return BooleanColumn;
}

initBooleanColumn.friendlyName = 'Boolean';
