import { isNumber, isUndefined, map, max, min } from "lodash";
import moment from "moment";
import plotlyCleanNumber from "plotly.js/src/lib/clean_number";

export function cleanNumber(value) {
  return isUndefined(value) ? value : plotlyCleanNumber(value);
}

export function getSeriesAxis(series, options) {
  const seriesOptions = options.seriesOptions[series.name] || { type: options.globalSeriesType };
  if (seriesOptions.yAxis === 1 && (!options.series.stacking || seriesOptions.type === "line")) {
    return "y2";
  }
  return "y";
}

export function normalizeValue(value, axisType, dateTimeFormat = "YYYY-MM-DD HH:mm:ss") {
  if (axisType === "datetime" && moment.utc(value).isValid()) {
    value = moment.utc(value);
  }
  if (moment.isMoment(value)) {
    return value.format(dateTimeFormat);
  }
  return value;
}

export function calculateAxisRange(seriesList, minValue, maxValue) {
  if (!isNumber(minValue)) {
    minValue = Math.min(0, min(map(seriesList, series => min(series.y))) || 0);
  }
  if (!isNumber(maxValue)) {
    maxValue = max(map(seriesList, series => max(series.y))) || 0;
  }

  // Expand range a little bit to ensure tha plot is fully visible and not cut on edges.
  // Plotly does similar thing when autorange enabled
  const range = maxValue - minValue;
  const threshold = Math.min(0.25, range * 0.01);

  return [minValue - threshold, maxValue + threshold];
}
