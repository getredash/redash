/* eslint-disable react/prop-types */
import { createNumberFormatter } from '@/lib/value-format';

export default function initNumberColumn(column) {
  const format = createNumberFormatter(column.numberFormat);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function NumberColumn({ row }) {
    const { text } = prepareData(row);
    return text;
  }

  NumberColumn.prepareData = prepareData;

  return NumberColumn;
}

initNumberColumn.friendlyName = 'Number';
