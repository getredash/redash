import { isUndefined } from "lodash";
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
