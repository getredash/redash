import { merge } from "lodash";
import { clientConfig } from "@/services/auth";

const DEFAULT_OPTIONS = {
  globalSeriesType: "column",
  sortX: true,
  legend: { enabled: true },
  yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
  xAxis: { type: "-", labels: { enabled: true } },
  error_y: { type: "data", visible: true },
  series: { stacking: null, error_y: { type: "data", visible: true } },
  seriesOptions: {},
  valuesOptions: {},
  columnMapping: {},
  direction: { type: "counterclockwise" },
  sizemode: "diameter",
  coefficient: 1,

  // showDataLabels: false, // depends on chart type
  numberFormat: "0,0[.]00000",
  percentFormat: "0[.]00%",
  // dateTimeFormat: 'DD/MM/YYYY HH:mm', // will be set from clientConfig
  textFormat: "", // default: combination of {{ @@yPercent }} ({{ @@y }} ± {{ @@yError }})

  missingValuesAsZero: true,
};

export default function getOptions(options) {
  const result = merge(
    {},
    DEFAULT_OPTIONS,
    {
      showDataLabels: options.globalSeriesType === "pie",
      dateTimeFormat: clientConfig.dateTimeFormat,
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
