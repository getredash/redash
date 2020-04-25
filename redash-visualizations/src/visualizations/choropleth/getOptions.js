import { merge } from "lodash";
import ColorPalette from "./ColorPalette";

const DEFAULT_OPTIONS = {
  mapType: "countries",
  countryCodeColumn: "",
  countryCodeType: "iso_a3",
  valueColumn: "",
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
  return merge({}, DEFAULT_OPTIONS, options);
}
