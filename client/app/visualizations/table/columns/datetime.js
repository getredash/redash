/* eslint-disable react/prop-types */
import { createDateTimeFormatter } from '@/lib/value-format';

export default function initDateTimeColumn(column) {
  const format = createDateTimeFormatter(column.dateTimeFormat);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function DateTimeColumn({ row }) {
    const { text } = prepareData(row);
    return text;
  }

  DateTimeColumn.prepareData = prepareData;

  return DateTimeColumn;
}

initDateTimeColumn.friendlyName = 'Date/Time';
