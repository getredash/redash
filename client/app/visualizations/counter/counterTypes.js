import { map, max, min, sumBy } from "lodash";

// 0 - special case, use first record
// 1..N - 1-based record number from beginning (wraps if greater than dataset size)
// -1..-N - 1-based record number from end (wraps if greater than dataset size)
function getRowNumber(rowNumber, rowsCount) {
  rowNumber = parseInt(rowNumber, 10) || 0;
  if (rowNumber === 0) {
    return rowNumber;
  }
  const wrappedIndex = (Math.abs(rowNumber) - 1) % rowsCount;
  return rowNumber > 0 ? wrappedIndex : rowsCount - wrappedIndex - 1;
}

export default {
  rowValue: {
    name: "Row Value",
    getValue: (rows, { column, rowNumber }) => {
      const row = rows[getRowNumber(rowNumber, rows.length)];
      const value = row ? row[column] : undefined;
      return [value, row];
    },
    options: ["column", "rowNumber"],
  },
  countRows: {
    name: "Count Rows",
    getValue: rows => [rows.length, null],
    options: [],
  },
  sumRows: {
    name: "Sum Values",
    getValue: (rows, { column }) => [sumBy(rows, column), null],
    options: ["column"],
  },
  minValue: {
    name: "Min Value",
    getValue: (rows, { column }) => [min(map(rows, row => row[column])), null],
    options: ["column"],
  },
  maxValue: {
    name: "Max Value",
    getValue: (rows, { column }) => [max(map(rows, row => row[column])), null],
    options: ["column"],
  },
};
