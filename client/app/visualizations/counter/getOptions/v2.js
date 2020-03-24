import { isEmpty, isFinite, merge, get, pick, padEnd, toString, includes, map } from "lodash";
import getOptionsV1 from "./v1";

const schemaVersion = 2;

const defaultOptions = {
  schemaVersion,

  counterLabel: "",

  stringDecChar: ".",
  stringThouSep: ",",
  numberFormat: "0,0",

  primaryValue: {
    show: true,
    type: "rowValue",
    column: "counter",
    rowNumber: 1,
    displayFormat: "{{ @@value_formatted }}",
    showTooltip: true,
    tooltipFormat: "{{ @@value }}",
  },
  secondaryValue: {
    show: true,
    type: "unused",
    column: null,
    rowNumber: 1,
    displayFormat: "({{ @@value_formatted }})",
    showTooltip: true,
    tooltipFormat: "{{ @@value }}",
  },
};

function migrateFromV1(options) {
  options = getOptionsV1(options);
  const result = pick(options, ["counterLabel", "stringDecChar", "stringThouSep"]);

  result.numberFormat = "0,0.000";
  if (isFinite(options.stringDecimal) && options.stringDecimal >= 0) {
    result.numberFormat = "0,0";
    if (options.stringDecimal > 0) {
      const decimals = padEnd("", options.stringDecimal, "0");
      result.numberFormat = `${result.numberFormat}.${decimals}`;
    }
  }

  const prefix = toString(options.stringPrefix);
  const suffix = toString(options.stringSuffix);

  result.primaryValue = {
    show: true,
    type: options.countRow ? "countRows" : "rowValue",
    column: options.counterColName,
    rowNumber: options.rowNumber,
    displayFormat: `${prefix}{{ @@value_formatted }}${suffix}`,
  };

  result.secondaryValue = {
    show: true,
    type: options.targetColName ? "rowValue" : "unused",
    column: options.targetColName,
    rowNumber: options.targetRowNumber,
    displayFormat: options.formatTargetValue ? `(${prefix}{{ @@value_formatted }}${suffix})` : "({{ @@value }})",
  };

  return result;
}

export default function getOptions(options, { columns }) {
  const currentSchemaVersion = get(options, "schemaVersion", isEmpty(options) ? schemaVersion : 0);
  if (currentSchemaVersion < schemaVersion) {
    options = migrateFromV1(options);
  }

  const optionsWithDefaults = merge({}, defaultOptions, options, { schemaVersion });
  const columnNameUpdates = {};

  const columnNames = map(columns, col => col.name);
  if (!includes(columnNames, get(optionsWithDefaults, "primaryValue.column"))) {
    columnNameUpdates.primaryValue = { column: null };
  }
  if (!includes(columnNames, get(optionsWithDefaults, "secondaryValue.column"))) {
    columnNameUpdates.secondaryValue = { column: null };
  }

  return merge({}, optionsWithDefaults, columnNameUpdates);
}
