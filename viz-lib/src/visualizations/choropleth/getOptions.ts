import { isNil, merge, first, keys, get } from "lodash";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import ColorPalette from "./ColorPalette";

function getDefaultMap() {
  return first(keys(visualizationsSettings.choroplethAvailableMaps)) || null;
}

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

export default function getOptions(options: any) {
  const result = merge({}, DEFAULT_OPTIONS, options);

  // Both renderer and editor always provide new `bounds` array, so no need to clone it here.
  // Keeping original object also reduces amount of updates in components
  result.bounds = get(options, "bounds");

  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (isNil(visualizationsSettings.choroplethAvailableMaps[result.mapType])) {
    result.mapType = getDefaultMap();
  }

  // backward compatibility
  if (!isNil(result.countryCodeColumn)) {
    result.keyColumn = result.countryCodeColumn;
  }
  delete result.countryCodeColumn;

  if (!isNil(result.countryCodeType)) {
    result.targetField = result.countryCodeType;
  }
  delete result.countryCodeType;

  return result;
}
