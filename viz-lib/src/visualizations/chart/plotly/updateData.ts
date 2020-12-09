import { isNil, each, extend, filter, identity, includes, map, sortBy } from "lodash";
import { createNumberFormatter, formatSimpleTemplate } from "@/lib/value-format";
import { normalizeValue } from "./utils";

function shouldUseUnifiedXAxis(options) {
  return options.sortX && options.xAxis.type === "category" && options.globalSeriesType !== "box";
}

function defaultFormatSeriesText(item) {
  let result = item["@@y"];
  if (item["@@yError"] !== undefined) {
    result = `${result} \u00B1 ${item["@@yError"]}`;
  }
  if (item["@@yPercent"] !== undefined) {
    result = `${item["@@yPercent"]} (${result})`;
  }
  if (item["@@size"] !== undefined) {
    result = `${result}: ${item["@@size"]}`;
  }
  return result;
}

function defaultFormatSeriesTextForPie(item) {
  return item["@@yPercent"] + " (" + item["@@y"] + ")";
}

function createTextFormatter(options) {
  if (options.textFormat === "") {
    return options.globalSeriesType === "pie" ? defaultFormatSeriesTextForPie : defaultFormatSeriesText;
  }
  return item => formatSimpleTemplate(options.textFormat, item);
}

function formatValue(value, axis, options) {
  let axisType = null;
  switch (axis) {
    case "x":
      axisType = options.xAxis.type;
      break;
    case "y":
      axisType = options.yAxis[0].type;
      break;
    case "y2":
      axisType = options.yAxis[1].type;
      break;
    // no default
  }
  return normalizeValue(value, axisType, options.dateTimeFormat);
}

function updateSeriesText(seriesList, options) {
  const formatNumber = createNumberFormatter(options.numberFormat);
  const formatPercent = createNumberFormatter(options.percentFormat);
  const formatText = createTextFormatter(options);

  const defaultY = options.missingValuesAsZero ? 0.0 : null;

  each(seriesList, series => {
    const seriesOptions = options.seriesOptions[series.name] || { type: options.globalSeriesType };

    series.text = [];
    series.hover = [];
    const xValues = options.globalSeriesType === "pie" ? series.labels : series.x;
    xValues.forEach(x => {
      const text = {
        "@@name": series.name,
      };
      const item = series.sourceData.get(x) || { x, y: defaultY, row: { x, y: defaultY } };

      const yValueIsAny = includes(["bubble", "scatter"], seriesOptions.type);

      // for `formatValue` we have to use original value of `x` and `y`: `item.x`/`item.y` contains value
      // already processed with `normalizeValue`, and if they were `moment` instances - they are formatted
      // using default (ISO) date/time format. Here we need to use custom date/time format, so we pass original value
      // to `formatValue` which will call `normalizeValue` again, but this time with different date/time format
      // (if needed)
      text["@@x"] = formatValue(item.row.x, "x", options);
      text["@@y"] = yValueIsAny ? formatValue(item.row.y, series.yaxis, options) : formatNumber(item.y);
      if (item.yError !== undefined) {
        text["@@yError"] = formatNumber(item.yError);
      }
      if (item.size !== undefined) {
        text["@@size"] = formatNumber(item.size);
      }

      if (options.series.percentValues || options.globalSeriesType === "pie") {
        text["@@yPercent"] = formatPercent(Math.abs(item.yPercent));
      }

      extend(text, item.row.$raw);

      series.text.push(formatText(text));
    });
  });
}

function updatePercentValues(seriesList, options) {
  if (options.series.percentValues) {
    // Some series may not have corresponding x-values;
    // do calculations for each x only for series that do have that x
    const sumOfCorrespondingPoints = new Map();
    each(seriesList, series => {
      series.sourceData.forEach(item => {
        const sum = sumOfCorrespondingPoints.get(item.x) || 0;
        sumOfCorrespondingPoints.set(item.x, sum + Math.abs(item.y || 0.0));
      });
    });

    each(seriesList, series => {
      const yValues = [];

      series.sourceData.forEach(item => {
        if (isNil(item.y) && !options.missingValuesAsZero) {
          item.yPercent = null;
        } else {
          const sum = sumOfCorrespondingPoints.get(item.x);
          item.yPercent = (item.y / sum) * 100;
        }
        yValues.push(item.yPercent);
      });

      series.y = yValues;
    });
  }
}

function getUnifiedXAxisValues(seriesList, sorted) {
  const set = new Set();
  each(seriesList, series => {
    // `Map.forEach` will walk items in insertion order
    series.sourceData.forEach(item => {
      set.add(item.x);
    });
  });

  const result = [...set];
  return sorted ? sortBy(result, identity) : result;
}

function updateUnifiedXAxisValues(seriesList, options) {
  const unifiedX = getUnifiedXAxisValues(seriesList, options.sortX);
  const defaultY = options.missingValuesAsZero ? 0.0 : null;
  each(seriesList, series => {
    series.x = [];
    series.y = [];
    series.error_y.array = [];
    each(unifiedX, x => {
      series.x.push(x);
      const item = series.sourceData.get(x);
      if (item) {
        series.y.push(options.series.percentValues ? item.yPercent : item.y);
        series.error_y.array.push(item.yError);
      } else {
        series.y.push(defaultY);
        series.error_y.array.push(null);
      }
    });
  });
}

function updatePieData(seriesList, options) {
  updateSeriesText(seriesList, options);
}

function updateLineAreaData(seriesList, options) {
  // Apply "percent values" modification
  updatePercentValues(seriesList, options);
  if (options.series.stacking) {
    updateUnifiedXAxisValues(seriesList, options);

    // Calculate cumulative value for each x tick
    const cumulativeValues = {};
    each(seriesList, series => {
      series.y = map(series.y, (y, i) => {
        if (isNil(y) && !options.missingValuesAsZero) {
          return null;
        }
        const x = series.x[i];
        const stackedY = y + (cumulativeValues[x] || 0.0);
        cumulativeValues[x] = stackedY;
        return stackedY;
      });
    });
  } else {
    if (shouldUseUnifiedXAxis(options)) {
      updateUnifiedXAxisValues(seriesList, options);
    }
  }

  // Finally - update text labels
  updateSeriesText(seriesList, options);
}

function updateDefaultData(seriesList, options) {
  // Apply "percent values" modification
  updatePercentValues(seriesList, options);

  if (!options.series.stacking) {
    if (shouldUseUnifiedXAxis(options)) {
      updateUnifiedXAxisValues(seriesList, options);
    }
  }

  // Finally - update text labels
  updateSeriesText(seriesList, options);
}

export default function updateData(seriesList, options) {
  // Use only visible series
  const visibleSeriesList = filter(seriesList, s => s.visible === true);

  if (visibleSeriesList.length > 0) {
    switch (options.globalSeriesType) {
      case "pie":
        updatePieData(visibleSeriesList, options);
        break;
      case "line":
      case "area":
        updateLineAreaData(visibleSeriesList, options);
        break;
      case "heatmap":
        break;
      default:
        updateDefaultData(visibleSeriesList, options);
        break;
    }
  }
  return seriesList;
}
