import { merge } from "lodash";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

const DEFAULT_OPTIONS = {
  globalSeriesType: "column",
  sortX: true,
  legend: { enabled: true, placement: "auto", traceorder: "normal" },
  xAxis: { type: "-", labels: { enabled: true } },
  yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
  alignYAxesAtZero: false,
  error_y: { type: "data", visible: true },
  series: { stacking: null, error_y: { type: "data", visible: true } },
  seriesOptions: {},
  valuesOptions: {},
  columnMapping: {},
  direction: { type: "counterclockwise" },
  sizemode: "diameter",
  coefficient: 1,

  // showDataLabels: false, // depends on chart type
  numberFormat: {
    style: "decimal",
    maximumFractionDigits: 5,
  },
  percentFormat: {
    style: "percent",
    maximumFractionDigits: 2,
  },
  // dateTimeFormat: 'DD/MM/YYYY HH:mm', // will be set from visualizationsSettings
  textFormat: "", // default: combination of {{ @@yPercent }} ({{ @@y }} ± {{ @@yError }})

  enableLink: false,
  linkOpenNewTab: true,
  linkFormat: "", // template like a textFormat

  missingValuesAsZero: true,
};

export default function getOptions(options: any) {
  const result = merge(
    {},
    DEFAULT_OPTIONS,
    {
      showDataLabels: options.globalSeriesType === "pie",
      dateTimeFormat: visualizationsSettings.dateTimeFormat,
    },
    options
  );

  // Backward compatibility
  if (["normal", "percent"].indexOf(result.series.stacking) >= 0) {
    result.series.percentValues = result.series.stacking === "percent";
    result.series.stacking = "stack";
  }

  return result;
}
