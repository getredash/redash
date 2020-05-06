import { isFinite, map, merge, includes } from "lodash";

const DEFAULT_OPTIONS = {
  stepCol: { colName: null, displayAs: "Steps" },
  valueCol: { colName: null, displayAs: "Value" },
  autoSort: true,
  sortKeyCol: { colName: null, reverse: false },
  itemsLimit: 100,
  percentValuesRange: { min: 0.01, max: 1000.0 },
  numberFormat: "0,0[.]00",
  percentFormat: "0[.]00%",
};

export default function getOptions(options, { columns }) {
  options = merge({}, DEFAULT_OPTIONS, options);

  // Validate
  const availableColumns = map(columns, c => c.name);
  if (!includes(availableColumns, options.stepCol.colName)) {
    options.stepCol.colName = null;
  }
  if (!includes(availableColumns, options.valueCol.colName)) {
    options.valueCol.colName = null;
  }
  if (!includes(availableColumns, options.sortKeyCol.colName)) {
    options.sortKeyCol.colName = null;
  }

  if (!isFinite(options.itemsLimit)) {
    options.itemsLimit = DEFAULT_OPTIONS.itemsLimit;
  }
  if (options.itemsLimit < 2) {
    options.itemsLimit = 2;
  }

  if (options.autoSort) {
    options.sortKeyCol.colName = options.valueCol.colName;
    options.sortKeyCol.reverse = true;
  }

  return options;
}
