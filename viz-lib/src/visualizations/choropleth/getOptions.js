import { isNil, merge, get } from "lodash";
import ColorPalette from "./ColorPalette";

const DEFAULT_OPTIONS = {
  mapType: "countries",
  keyColumn: null,
  targetField: null,
  valueColumn: null,
  clusteringMode: "e",
  steps: 5,
  valueFormat: "0,0.00",
  noValuePlaceholder: "N/A",
  colors: {
    min: ColorPalette["Light Blue"],
    max: ColorPalette["Dark Blue"],
    background: ColorPalette.White,
    borders: ColorPalette.White,
    noValue: ColorPalette["Light Gray"],
  },
  legend: {
    visible: true,
    position: "bottom-left",
    alignText: "right",
  },
  tooltip: {
    enabled: true,
    template: "<b>{{ @@name }}</b>: {{ @@value }}",
  },
  popup: {
    enabled: true,
    template: "Country: <b>{{ @@name_long }} ({{ @@iso_a2 }})</b>\n<br>\nValue: <b>{{ @@value }}</b>",
  },
};

export default function getOptions(options) {
  const result = merge({}, DEFAULT_OPTIONS, options);

  // Both renderer and editor always provide new `bounds` array, so no need to clone it here.
  // Keeping original object also reduces amount of updates in components
  result.bounds = get(options, "bounds");

  // backward compatibility
  if (!isNil(result.countryCodeColumn)) {
    result.keyColumn = result.countryCodeColumn;
    delete result.countryCodeColumn;
  }

  if (!isNil(result.countryCodeType)) {
    result.targetField = result.countryCodeType;
    delete result.countryCodeType;
  }

  return result;
}
