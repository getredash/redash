import {
  isArray, isNumber, isString, isUndefined, contains, min, max, has, find,
  each, values, sortBy, pluck, identity, filter, map,
} from 'underscore';
import moment from 'moment';
import { createFormatter } from '@/lib/value-format';

// The following colors will be used if you pick "Automatic" color.
const BaseColors = {
  Blue: '#356AFF',
  Red: '#E92828',
  Green: '#3BD973',
  Purple: '#604FE9',
  Cyan: '#50F5ED',
  Orange: '#FB8D3D',
  'Light Blue': '#799CFF',
  Lilac: '#B554FF',
  'Light Green': '#8CFFB4',
  Brown: '#A55F2A',
  Black: '#000000',
  Gray: '#494949',
  Pink: '#FF7DE3',
  'Dark Blue': '#002FB4',
};

// Additional colors for the user to choose from:
export const ColorPalette = Object.assign({}, BaseColors, {
  'Indian Red': '#981717',
  'Green 2': '#17BF51',
  'Green 3': '#049235',
  DarkTurquoise: '#00B6EB',
  'Dark Violet': '#A58AFF',
  'Pink 2': '#C63FA9',
});

const formatNumber = createFormatter({ displayAs: 'number', numberFormat: '0,0[.]00000' });
const formatPercent = createFormatter({ displayAs: 'number', numberFormat: '0[.]00' });

const ColorPaletteArray = values(BaseColors);

function getFontColor(bgcolor) {
  let result = '#333333';
  if (isString(bgcolor)) {
    let matches = /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(bgcolor);
    let r;
    let g;
    let b;
    if (matches) {
      r = parseInt(matches[1], 16);
      g = parseInt(matches[2], 16);
      b = parseInt(matches[3], 16);
    } else {
      matches = /#?([0-9a-f])([0-9a-f])([0-9a-f])/i.exec(bgcolor);
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

export function normalizeValue(value) {
  if (moment.isMoment(value)) {
    return value.format('YYYY-MM-DD HH:mm:ss');
  }
  return value;
}

function calculateAxisRange(seriesList, minValue, maxValue) {
  if (!isNumber(minValue)) {
    minValue = Math.min(0, min(map(seriesList, series => min(series.y))));
  }
  if (!isNumber(maxValue)) {
    maxValue = max(map(seriesList, series => max(series.y)));
  }
  return [minValue, maxValue];
}

function getScaleType(scale) {
  if (scale === 'datetime') {
    return 'date';
  }
  if (scale === 'logarithmic') {
    return 'log';
  }
  return scale;
}

function getSeriesColor(seriesOptions, seriesIndex) {
  return seriesOptions.color || ColorPaletteArray[seriesIndex % ColorPaletteArray.length];
}

function getTitle(axis) {
  if (!isUndefined(axis) && !isUndefined(axis.title)) {
    return axis.title.text;
  }
  return null;
}

function setType(series, type, options) {
  switch (type) {
    case 'column':
      series.type = 'bar';
      if (options.showDataLabels) {
        series.textposition = 'inside';
      }
      break;
    case 'line':
      series.mode = 'lines' + (options.showDataLabels ? '+text' : '');
      break;
    case 'area':
      series.mode = 'lines' + (options.showDataLabels ? '+text' : '');
      series.fill = options.series.stacking === null ? 'tozeroy' : 'tonexty';
      break;
    case 'scatter':
      series.type = 'scatter';
      series.mode = 'markers' + (options.showDataLabels ? '+text' : '');
      break;
    case 'bubble':
      series.mode = 'markers';
      break;
    case 'box':
      series.type = 'box';
      series.mode = 'markers';
      break;
    default:
      break;
  }
}

function calculateDimensions(series, options) {
  const rows = series.length > 2 ? 2 : 1;
  const cellsInRow = Math.ceil(series.length / rows);
  const cellWidth = 1 / cellsInRow;
  const cellHeight = 1 / rows;
  const xPadding = 0.02;
  const yPadding = 0.1;

  const hasX = contains(values(options.columnMapping), 'x');
  const hasY2 = !!find(series, (serie) => {
    const seriesOptions = options.seriesOptions[serie.name] || { type: options.globalSeriesType };
    return (seriesOptions.yAxis === 1) && (
      (options.series.stacking === null) || (seriesOptions.type === 'line')
    );
  });

  return {
    rows, cellsInRow, cellWidth, cellHeight, xPadding, yPadding, hasX, hasY2,
  };
}

function getUnifiedXAxisValues(seriesList, sorted) {
  const set = new Set();
  each(seriesList, (series) => {
    // `Map.forEach` will walk items in insertion order
    series.sourceData.forEach((item) => {
      set.add(item.x);
    });
  });

  const result = [];
  // `Set.forEach` will walk items in insertion order
  set.forEach((item) => {
    result.push(item);
  });

  return sorted ? sortBy(result, identity) : result;
}

function preparePieData(seriesList, options) {
  const {
    cellWidth, cellHeight, xPadding, yPadding, cellsInRow, hasX,
  } = calculateDimensions(seriesList, options);

  return map(seriesList, (serie, index) => {
    const xPosition = (index % cellsInRow) * cellWidth;
    const yPosition = Math.floor(index / cellsInRow) * cellHeight;
    return {
      values: pluck(serie.data, 'y'),
      labels: map(serie.data, row => (hasX ? row.x : `Slice ${index}`)),
      type: 'pie',
      hole: 0.4,
      marker: { colors: ColorPaletteArray },
      text: serie.name,
      textposition: 'inside',
      textfont: { color: '#ffffff' },
      name: serie.name,
      domain: {
        x: [xPosition, xPosition + cellWidth - xPadding],
        y: [yPosition, yPosition + cellHeight - yPadding],
      },
    };
  });
}

function prepareChartData(seriesList, options) {
  const sortX = (options.sortX === true) || (options.sortX === undefined);

  return map(seriesList, (series, index) => {
    const seriesOptions = options.seriesOptions[series.name] ||
      { type: options.globalSeriesType };

    const seriesColor = getSeriesColor(seriesOptions, index);

    // Sort by x - `Map` preserves order of items
    const data = sortX ? sortBy(series.data, d => normalizeValue(d.x)) : series.data;

    const sourceData = new Map();
    const xValues = [];
    const yValues = [];
    const yErrorValues = [];
    each(data, (row) => {
      const x = normalizeValue(row.x);
      const y = normalizeValue(row.y);
      const yError = normalizeValue(row.yError);
      sourceData.set(x, {
        x,
        y,
        yError,
        yPercent: null, // will be updated later
      });
      xValues.push(x);
      yValues.push(y);
      yErrorValues.push(yError);
    });

    const plotlySeries = {
      visible: true,
      hoverinfo: 'x+text+name',
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
      sourceData,
    };

    if (
      (seriesOptions.yAxis === 1) &&
      ((options.series.stacking === null) || (seriesOptions.type === 'line'))
    ) {
      plotlySeries.yaxis = 'y2';
    }

    setType(plotlySeries, seriesOptions.type, options);

    if (seriesOptions.type === 'bubble') {
      plotlySeries.marker = {
        size: pluck(data, 'size'),
      };
    } else if (seriesOptions.type === 'box') {
      plotlySeries.boxpoints = 'outliers';
      plotlySeries.hoverinfo = false;
      plotlySeries.marker = {
        color: seriesColor,
        size: 3,
      };
      if (options.showpoints) {
        plotlySeries.boxpoints = 'all';
        plotlySeries.jitter = 0.3;
        plotlySeries.pointpos = -1.8;
      }
    }

    return plotlySeries;
  });
}

export function prepareData(seriesList, options) {
  if (options.globalSeriesType === 'pie') {
    return preparePieData(seriesList, options);
  }
  return prepareChartData(seriesList, options);
}

export function prepareLayout(element, seriesList, options, data) {
  const {
    cellsInRow, cellWidth, cellHeight, xPadding, hasY2,
  } = calculateDimensions(seriesList, options);

  const result = {
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 20,
      pad: 4,
    },
    width: Math.floor(element.offsetWidth),
    height: Math.floor(element.offsetHeight),
    autosize: true,
    showlegend: has(options, 'legend') ? options.legend.enabled : true,
  };

  if (options.globalSeriesType === 'pie') {
    result.annotations = filter(map(seriesList, (series, index) => {
      const xPosition = (index % cellsInRow) * cellWidth;
      const yPosition = Math.floor(index / cellsInRow) * cellHeight;
      return {
        x: xPosition + ((cellWidth - xPadding) / 2),
        y: yPosition + cellHeight - 0.015,
        xanchor: 'center',
        yanchor: 'top',
        text: series.name,
        showarrow: false,
      };
    }));
  } else {
    if (options.globalSeriesType === 'box') {
      result.boxmode = 'group';
      result.boxgroupgap = 0.50;
    }

    result.xaxis = {
      title: getTitle(options.xAxis),
      type: getScaleType(options.xAxis.type),
    };

    if (options.sortX && result.xaxis.type === 'category') {
      result.xaxis.categoryorder = 'category ascending';
    }

    if (!isUndefined(options.xAxis.labels)) {
      result.xaxis.showticklabels = options.xAxis.labels.enabled;
    }

    if (isArray(options.yAxis)) {
      result.yaxis = {
        title: getTitle(options.yAxis[0]),
        type: getScaleType(options.yAxis[0].type),
      };

      if (isNumber(options.yAxis[0].rangeMin) || isNumber(options.yAxis[0].rangeMax)) {
        result.yaxis.range = calculateAxisRange(
          data.filter(s => !s.yaxis !== 'y2'),
          options.yAxis[0].rangeMin,
          options.yAxis[0].rangeMax,
        );
      }
    }

    if (hasY2 && !isUndefined(options.yAxis)) {
      result.yaxis2 = {
        title: getTitle(options.yAxis[1]),
        type: getScaleType(options.yAxis[1].type),
        overlaying: 'y',
        side: 'right',
      };

      if (isNumber(options.yAxis[1].rangeMin) || isNumber(options.yAxis[1].rangeMax)) {
        result.yaxis2.range = calculateAxisRange(
          data.filter(s => s.yaxis === 'y2'),
          options.yAxis[1].rangeMin,
          options.yAxis[1].rangeMax,
        );
      }
    }

    if (options.series.stacking) {
      result.barmode = 'relative';
    }
  }

  return result;
}

function updateSeriesText(seriesList, options) {
  each(seriesList, (series) => {
    series.text = [];
    series.x.forEach((x) => {
      let text = null;
      const item = series.sourceData.get(x);
      if (item) {
        text = formatNumber(item.y);
        if (item.yError !== undefined) {
          text = `${text} \u00B1 ${formatNumber(item.yError)}`;
        }

        if (options.series.percentValues) {
          text = `${formatPercent(Math.abs(item.yPercent))}% (${text})`;
        }
      }

      series.text.push(text);
    });
  });
  return seriesList;
}

function updatePercentValues(seriesList, options) {
  if (options.series.percentValues && (seriesList.length > 0)) {
    // Some series may not have corresponding x-values;
    // do calculations for each x only for series that do have that x
    const sumOfCorrespondingPoints = new Map();
    each(seriesList, (series) => {
      series.sourceData.forEach((item) => {
        const sum = sumOfCorrespondingPoints.get(item.x) || 0;
        sumOfCorrespondingPoints.set(item.x, sum + Math.abs(item.y));
      });
    });

    each(seriesList, (series) => {
      const yValues = [];

      series.sourceData.forEach((item) => {
        const sum = sumOfCorrespondingPoints.get(item.x);
        item.yPercent = Math.sign(item.y) * Math.abs(item.y) / sum * 100;
        yValues.push(item.yPercent);
      });

      series.y = yValues;
    });
  }

  return seriesList;
}

function updateUnifiedXAxisValues(seriesList, options, sorted, defaultY) {
  const unifiedX = getUnifiedXAxisValues(seriesList, sorted);
  defaultY = defaultY === undefined ? null : defaultY;
  each(seriesList, (series) => {
    series.x = [];
    series.y = [];
    series.error_y.array = [];
    each(unifiedX, (x) => {
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

export function updateData(seriesList, options) {
  if (seriesList.length === 0) {
    return seriesList;
  }
  if (options.globalSeriesType === 'pie') {
    return seriesList;
  }

  // Use only visible series
  seriesList = filter(seriesList, s => s.visible === true);

  // Apply "percent values" modification
  updatePercentValues(seriesList, options);

  const sortX = (options.sortX === true) || (options.sortX === undefined);

  if (options.series.stacking) {
    if (['line', 'area'].indexOf(options.globalSeriesType) >= 0) {
      updateUnifiedXAxisValues(seriesList, options, sortX, 0);

      // Calculate cumulative value for each x tick
      let prevSeries = null;
      each(seriesList, (series) => {
        if (prevSeries) {
          series.y = map(series.y, (y, i) => prevSeries.y[i] + y);
        }
        prevSeries = series;
      });
    }
  } else {
    const useUnifiedXAxis = sortX && (options.xAxis.type === 'category') && (options.globalSeriesType !== 'box');
    if (useUnifiedXAxis) {
      updateUnifiedXAxisValues(seriesList, options, sortX);
    }
  }

  // Finally - update text labels
  updateSeriesText(seriesList, options);
}

export function calculateMargins(element) {
  const axisSpacing = 20;

  const result = {};

  const edges = { l: '.ytick', r: '.y2tick', b: '.xtick' };
  const dimensions = { l: 'width', r: 'width', b: 'height' };

  each(edges, (selector, key) => {
    const ticks = element.querySelectorAll(selector);
    if (ticks.length > 0) {
      result[key] = max(map(ticks, (tick) => {
        const bounds = tick.getBoundingClientRect();
        return Math.ceil(bounds[dimensions[key]]);
      })) + axisSpacing;
    }
  });

  return result;
}

export function updateDimensions(layout, element, margins) {
  let changed = false;
  each(layout.margin, (value, key) => {
    if (isNumber(margins[key]) && (value !== margins[key])) {
      layout.margin[key] = margins[key];
      changed = true;
    }
  });

  const width = Math.floor(element.offsetWidth);
  const height = Math.floor(element.offsetHeight);

  if ((width !== layout.width) || (height !== layout.height)) {
    layout.width = element.offsetWidth;
    layout.height = element.offsetHeight;
    changed = true;
  }

  return changed;
}
