import { isUndefined } from "lodash";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'plot... Remove this comment to see the full error message
import plotlyCleanNumber from "plotly.js/src/lib/clean_number";

export function cleanNumber(value: any) {
  return isUndefined(value) ? value : plotlyCleanNumber(value);
}

export function getSeriesAxis(series: any, options: any) {
  const seriesOptions = options.seriesOptions[series.name] || { type: options.globalSeriesType };
  if (seriesOptions.yAxis === 1 && (!options.series.stacking || seriesOptions.type === "line")) {
    return "y2";
  }
  return "y";
}

export function normalizeValue(value: any, axisType: any, dateTimeFormat = "YYYY-MM-DD HH:mm:ss") {
  if (axisType === "datetime" && dayjs.utc(value).isValid()) {
    value = dayjs.utc(value);
  }
  if (dayjs.isDayjs(value)) {
    return value.format(dateTimeFormat);
  }
  return value;
}
