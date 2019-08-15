import { isNil, each, includes, isString, map, sortBy } from 'lodash';
import { cleanNumber, normalizeValue, getSeriesAxis } from './utils';
import { ColorPaletteArray } from '@/visualizations/ColorPalette';

function getSeriesColor(seriesOptions, seriesIndex) {
  return seriesOptions.color || ColorPaletteArray[seriesIndex % ColorPaletteArray.length];
}

function getFontColor(backgroundColor) {
  let result = '#333333';
  if (isString(backgroundColor)) {
    let matches = /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(backgroundColor);
    let r;
    let g;
    let b;
    if (matches) {
      r = parseInt(matches[1], 16);
      g = parseInt(matches[2], 16);
      b = parseInt(matches[3], 16);
    } else {
      matches = /#?([0-9a-f])([0-9a-f])([0-9a-f])/i.exec(backgroundColor);
      if (matches) {
        r = parseInt(matches[1] + matches[1], 16);
        g = parseInt(matches[2] + matches[2], 16);
        b = parseInt(matches[3] + matches[3], 16);
      } else {
        return result;
      }
    }

    const lightness = r * 0.299 + g * 0.587 + b * 0.114;
    if (lightness < 170) {
      result = '#ffffff';
    }
  }

  return result;
}

function getHoverInfoPattern(options) {
  const hasX = /{{\s*@@x\s*}}/.test(options.textFormat);
  const hasName = /{{\s*@@name\s*}}/.test(options.textFormat);
  let result = 'text';
  if (!hasX) result += '+x';
  if (!hasName) result += '+name';
  return result;
}

function prepareBarSeries(series, options) {
  series.type = 'bar';
  if (options.showDataLabels) {
    series.textposition = 'inside';
  }
  return series;
}

function prepareLineSeries(series, options) {
  series.mode = 'lines' + (options.showDataLabels ? '+text' : '');
  return series;
}

function prepareAreaSeries(series, options) {
  series.mode = 'lines' + (options.showDataLabels ? '+text' : '');
  series.fill = options.series.stacking ? 'tonexty' : 'tozeroy';
  return series;
}

function prepareScatterSeries(series, options) {
  series.type = 'scatter';
  series.mode = 'markers' + (options.showDataLabels ? '+text' : '');
  return series;
}

function prepareBubbleSeries(series, options, { seriesColor, data }) {
  series.mode = 'markers';
  series.marker = {
    color: seriesColor,
    size: map(data, i => i.size),
  };
  return series;
}

function prepareBoxSeries(series, options, { seriesColor }) {
  series.type = 'box';
  series.mode = 'markers';

  series.boxpoints = 'outliers';
  series.hoverinfo = false;
  series.marker = {
    color: seriesColor,
    size: 3,
  };
  if (options.showpoints) {
    series.boxpoints = 'all';
    series.jitter = 0.3;
    series.pointpos = -1.8;
  }
  return series;
}

function prepareSeries(series, options, additionalOptions) {
  const { hoverInfoPattern, index } = additionalOptions;

  const seriesOptions = options.seriesOptions[series.name] || { type: options.globalSeriesType };
  const seriesColor = getSeriesColor(seriesOptions, index);
  const seriesYAxis = getSeriesAxis(series, options);

  // Sort by x - `Map` preserves order of items
  const data = options.sortX ? sortBy(series.data, d => normalizeValue(d.x, options.xAxis.type)) : series.data;

  // For bubble/scatter charts `y` may be any (similar to `x`) - numeric is only bubble size;
  // for other types `y` is always number
  const cleanYValue = includes(['bubble', 'scatter'], seriesOptions.type) ? normalizeValue : (v) => {
    v = cleanNumber(v);
    return (options.missingValuesAsZero && isNil(v)) ? 0.0 : v;
  };

  const sourceData = new Map();
  const xValues = [];
  const yValues = [];
  const yErrorValues = [];
  each(data, (row) => {
    const x = normalizeValue(row.x, options.xAxis.type); // number/datetime/category
    const y = cleanYValue(row.y, seriesYAxis === 'y2' ? options.yAxis[1].type : options.yAxis[0].type); // depends on series type!
    const yError = cleanNumber(row.yError); // always number
    const size = cleanNumber(row.size); // always number
    sourceData.set(x, {
      x,
      y,
      yError,
      size,
      yPercent: null, // will be updated later
      row,
    });
    xValues.push(x);
    yValues.push(y);
    yErrorValues.push(yError);
  });

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
      color: getFontColor(seriesColor),
    },
    yaxis: seriesYAxis,
    sourceData,
  };

  additionalOptions = { ...additionalOptions, seriesColor, data };

  switch (seriesOptions.type) {
    case 'column': return prepareBarSeries(plotlySeries, options, additionalOptions);
    case 'line': return prepareLineSeries(plotlySeries, options, additionalOptions);
    case 'area': return prepareAreaSeries(plotlySeries, options, additionalOptions);
    case 'scatter': return prepareScatterSeries(plotlySeries, options, additionalOptions);
    case 'bubble': return prepareBubbleSeries(plotlySeries, options, additionalOptions);
    case 'box': return prepareBoxSeries(plotlySeries, options, additionalOptions);
    default: return plotlySeries;
  }
}

export default function prepareDefaultData(seriesList, options) {
  const additionalOptions = {
    hoverInfoPattern: getHoverInfoPattern(options),
  };

  return map(seriesList, (series, index) => prepareSeries(series, options, { ...additionalOptions, index }));
}
