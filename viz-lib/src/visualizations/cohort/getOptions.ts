import { merge } from "lodash";
import ColorPalette from "@/visualizations/ColorPalette";

const DEFAULT_OPTIONS = {
  timeInterval: "daily",
  mode: "diagonal",
  dateColumn: "date",
  stageColumn: "day_number",
  totalColumn: "total",
  valueColumn: "value",

  showTooltips: true,
  percentValues: true,

  timeColumnTitle: "Time",
  peopleColumnTitle: "Users",
  stageColumnTitle: "{{ @ }}",

  numberFormat: {
    style: "decimal",
    maximumFractionDigits: 2,
  },
  percentFormat: {
    style: "percent",
    maximumFractionDigits: 2,
  },
  noValuePlaceholder: "-",

  colors: {
    min: "#ffffff",
    max: ColorPalette["Dark Blue"],
    steps: 7,
  },
};

export default function getOptions(options: any) {
  return merge({}, DEFAULT_OPTIONS, options);
}
