import { isFinite, merge, get, pick, padEnd, toString } from "lodash";
import getOptionsV1 from "./v1";

const schemaVersion = 2;

const defaultOptions = {
  counterLabel: "",

  stringDecChar: ".",
  stringThouSep: ",",
  numberFormat: "0,0[.]0000",

  primaryValue: {
    show: true,
    type: "rowValue",
    column: "counter",
    rowNumber: 1,
    displayFormat: "{{ @@formatted }}",
    showTooltip: true,
    tooltipFormat: "{{ @@raw }}",
  },
  secondaryValue: {
    show: false,
    type: "rowValue",
    column: null,
    rowNumber: 1,
    displayFormat: "{{ @@formatted }}",
    showTooltip: true,
    tooltipFormat: "{{ @@raw }}",
  },
};

function migrateFromV1(options) {
  options = getOptionsV1(options);
  const result = pick(options, ["counterLabel", "stringDecChar", "stringThouSep"]);

  result.numberFormat = "0,0.000";
  if (isFinite(options.stringDecimal) && (options.stringDecimal >= 0)) {
    result.numberFormat = "0,0";
    if (options.stringDecimal > 0) {
      result.numberFormat += padEnd("", options.stringDecimal, "0");
    }
  }

  const prefix = toString(options.stringPrefix);
  const suffix = toString(options.stringSuffix);

  result.primaryValue = {
    show: true,
    type: "rowValue",
    column: options.counterColName,
    rowNumber: options.rowNumber,
    displayFormat: `${prefix}{{ @@formatted }}${suffix}`,
  };

  result.secondaryValue = {
    show: !!options.targetColName,
    type: "rowValue",
    column: options.targetColName,
    rowNumber: options.targetRowNumber,
    displayFormat: options.formatTargetValue ? `${prefix}{{ @@formatted }}${suffix}` : "{{ @@raw }}",
  };

  return result;
}

export default function getOptions(options) {
  const currentSchemaVersion = get(options, 'schemaVersion', 0);
  if (currentSchemaVersion < schemaVersion) {
    options = migrateFromV1(options);
  }
  return merge({}, defaultOptions, options, { schemaVersion });
}
