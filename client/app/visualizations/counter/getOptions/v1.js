import { extend } from "lodash";

const schemaVersion = 1;

const defaultOptions = {
  counterLabel: "",
  counterColName: "counter",
  rowNumber: 1,
  targetColName: null,
  targetRowNumber: 1,
  stringDecimal: 0,
  stringDecChar: ".",
  stringThouSep: ",",
  stringPrefix: null,
  stringSuffix: null,
  formatTargetValue: false,
  countRow: false,
};

export default function getOptions(options) {
  return extend({}, defaultOptions, options, { schemaVersion });
}
