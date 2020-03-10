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

// `name`: string
//   Human-readable name of counter type.
//
// `getValue`: (rows, valueOptions) => [value, row?]
//   Takes all query result rows as a first argument and value options (primary or secondary) as second.
//   Returns an array with two items: corresponding counter value (primary or secondary) and
//   optionally a row from query result. If `getValue` may return row in addition to counter
//   value - `canReturnRow` should be set to `true` (see `rowValue` for the reference).
//
// `options`: string[]
//   List of additional options to show in visualization editor for the particular counter type.

export default {
  unused: {
    name: "Unused",
    getValue: () => [undefined, null],
    options: [],
  },
  rowValue: {
    name: "Row Value",
    getValue: (rows, { column, rowNumber }) => {
      const row = rows[getRowNumber(rowNumber, rows.length)];
      const value = row ? row[column] : undefined;
      return [value, row];
    },
    canReturnRow: true,
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
