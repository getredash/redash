import { isNil, extend, each, includes, map, sortBy, toString } from "lodash";
import chooseTextColorForBackground from "@/lib/chooseTextColorForBackground";
import { AllColorPaletteArrays, ColorPaletteTypes } from "@/visualizations/ColorPalette";
import { cleanNumber, normalizeValue, getSeriesAxis } from "./utils";

function getSeriesColor(options: any, seriesOptions: any, seriesIndex: any, numSeries: any) {
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  let palette = AllColorPaletteArrays[options.color_scheme];
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (ColorPaletteTypes[options.color_scheme] === 'continuous' && palette.length > numSeries) {
    const step = (palette.length - 1) / (numSeries - 1 || 1);
    const index = Math.round(step * seriesIndex);
    return seriesOptions.color || palette[index % palette.length];
  }
  return seriesOptions.color || palette[seriesIndex % palette.length];
}

function getHoverInfoPattern(options: any) {
  const hasX = /{{\s*@@x\s*}}/.test(options.textFormat);
  const hasName = /{{\s*@@name\s*}}/.test(options.textFormat);
  let result = "text";
  if (!hasX) result += "+x";
  if (!hasName) result += "+name";
  return result;
}

function prepareBarSeries(series: any, options: any, additionalOptions: any) {
  series.type = "bar";
  series.offsetgroup = toString(additionalOptions.index);
  if (options.showDataLabels) {
    series.textposition = "inside";
  }
  return series;
}

function prepareLineSeries(series: any, options: any) {
  series.mode = "lines" + (options.showDataLabels ? "+text" : "");
  return series;
}

function prepareAreaSeries(series: any, options: any) {
  series.mode = "lines" + (options.showDataLabels ? "+text" : "");
  series.fill = options.series.stacking ? "tonexty" : "tozeroy";
  return series;
}

function prepareScatterSeries(series: any, options: any) {
  series.type = "scatter";
  series.mode = "markers" + (options.showDataLabels ? "+text" : "");
  return series;
}

function prepareBubbleSeries(series: any, options: any, { seriesColor, data }: any) {
  const coefficient = options.coefficient || 1;
  series.mode = "markers";
  series.marker = {
    color: seriesColor,
    size: map(data, i => i.size * coefficient),
    sizemode: options.sizemode || "diameter",
  };
  return series;
}

function prepareBoxSeries(series: any, options: any, { seriesColor }: any) {
  series.type = "box";
  series.mode = "markers";

  series.boxpoints = "outliers";
  series.hoverinfo = false;
  series.marker = {
    color: seriesColor,
    size: 3,
  };
  if (options.showpoints) {
    series.boxpoints = "all";
    series.jitter = 0.3;
    series.pointpos = -1.8;
  }
  return series;
}

function prepareSeries(series: any, options: any, numSeries: any, additionalOptions: any) {
  const { hoverInfoPattern, index } = additionalOptions;

  const seriesOptions = extend({ type: options.globalSeriesType, yAxis: 0 }, options.seriesOptions[series.name]);
  const seriesColor = getSeriesColor(options, seriesOptions, index, numSeries);
  const seriesYAxis = getSeriesAxis(series, options);

  // Sort by x - `Map` preserves order of items
  const data = options.sortX ? sortBy(series.data, d => normalizeValue(d.x, options.xAxis.type)) : series.data;

  // For bubble/scatter charts `y` may be any (similar to `x`) - numeric is only bubble size;
  // for other types `y` is always number
  const cleanYValue = includes(["bubble", "scatter"], seriesOptions.type)
    ? normalizeValue
    : (v: any) => {
        v = cleanNumber(v);
        return options.missingValuesAsZero && isNil(v) ? 0.0 : v;
      };

  const sourceData = new Map();

  const labelsValuesMap = new Map();

  const yErrorValues: any = [];
  each(data, row => {
    const x = normalizeValue(row.x, options.xAxis.type); // number/datetime/category
    const y = cleanYValue(row.y, seriesYAxis === "y2" ? options.yAxis[1].type : options.yAxis[0].type); // depends on series type!
    const yError = cleanNumber(row.yError); // always number
    const size = cleanNumber(row.size); // always number
    if (labelsValuesMap.has(x)) {
      labelsValuesMap.set(x, labelsValuesMap.get(x) + y);
    } else {
      labelsValuesMap.set(x, y);
    }
    const aggregatedY = labelsValuesMap.get(x);

    sourceData.set(x, {
      x,
      y: aggregatedY,
      yError,
      size,
      yPercent: null, // will be updated later
      row,
    });
    yErrorValues.push(yError);
  });

  const xValues = Array.from(labelsValuesMap.keys());
  const yValues = Array.from(labelsValuesMap.values());

  const plotlySeries = {
    visible: true,
    hoverinfo: hoverInfoPattern,
    x: xValues,
    y: yValues,
    error_y: {
      array: yErrorValues,
      color: seriesColor,
    },
    name: seriesOptions.name || series.name,
    marker: { color: seriesColor },
    insidetextfont: {
      color: chooseTextColorForBackground(seriesColor),
    },
    yaxis: seriesYAxis,
    sourceData,
  };

  additionalOptions = { ...additionalOptions, seriesColor, data };

  switch (seriesOptions.type) {
    case "column":
      return prepareBarSeries(plotlySeries, options, additionalOptions);
    case "line":
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 3.
      return prepareLineSeries(plotlySeries, options, additionalOptions);
    case "area":
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 3.
      return prepareAreaSeries(plotlySeries, options, additionalOptions);
    case "scatter":
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 3.
      return prepareScatterSeries(plotlySeries, options, additionalOptions);
    case "bubble":
      return prepareBubbleSeries(plotlySeries, options, additionalOptions);
    case "box":
      return prepareBoxSeries(plotlySeries, options, additionalOptions);
    default:
      return plotlySeries;
  }
}

export default function prepareDefaultData(seriesList: any, options: any) {
  const additionalOptions = {
    hoverInfoPattern: getHoverInfoPattern(options),
  };
  const numSeries = seriesList.length

  return map(seriesList, (series, index) => prepareSeries(series, options, numSeries, { ...additionalOptions, index }));
}
