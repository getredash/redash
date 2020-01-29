import { isNil, merge } from "lodash";
import ColorPalette from "./ColorPalette";
import availableMaps from "./maps";

const DEFAULT_OPTIONS = {
  mapUrl: availableMaps.countries.url,
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

  // backward compatibility
  if (!isNil(result.mapType)) {
    result.mapUrl = availableMaps[result.mapType] ? availableMaps[result.mapType].url : null;
    delete result.mapType;

    result.keyColumn = result.countryCodeColumn;
    delete result.countryCodeColumn;

    result.targetField = result.countryCodeType;
    delete result.countryCodeType;
  }

  return result;
}
