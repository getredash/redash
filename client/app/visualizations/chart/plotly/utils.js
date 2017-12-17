import {
  isArray, isNumber, isUndefined, contains, min, max, has, find, first, last,
  each, values, sortBy, union, pluck, identity, filter, map, constant,
} from 'underscore';
import moment from 'moment';
import createFormatter from '@/lib/value-format';

// The following colors will be used if you pick "Automatic" color.
const BaseColors = {
  Blue: '#4572A7',
  Red: '#AA4643',
  Green: '#89A54E',
  Purple: '#80699B',
  Cyan: '#3D96AE',
  Orange: '#DB843D',
  'Light Blue': '#92A8CD',
  Lilac: '#A47D7C',
  'Light Green': '#B5CA92',
  Brown: '#A52A2A',
  Black: '#000000',
  Gray: '#808080',
  Pink: '#FFC0CB',
  'Dark Blue': '#00008b',
};

// Additional colors for the user to choose from:
export const ColorPalette = Object.assign({}, BaseColors, {
  'Indian Red': '#F8766D',
  'Green 2': '#53B400',
  'Green 3': '#00C094',
  DarkTurquoise: '#00B6EB',
  'Dark Violet': '#A58AFF',
  'Pink 2': '#FB61D7',
});

const formatNumber = createFormatter({ displayAs: 'number', numberFormat: '0,0[.]00' });
const formatPercent = createFormatter({ displayAs: 'number', numberFormat: '0[.]00' });

const ColorPaletteArray = values(BaseColors);

function normalizeValue(value) {
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
  if (type === 'column') {
    series.type = 'bar';
  } else if (type === 'line') {
    series.mode = 'lines';
  } else if (type === 'area') {
    series.fill = options.series.stacking === null ? 'tozeroy' : 'tonexty';
    series.mode = 'lines';
  } else if (type === 'scatter') {
    series.type = 'scatter';
    series.mode = 'markers';
  } else if (type === 'bubble') {
    series.mode = 'markers';
  } else if (type === 'box') {
    series.type = 'box';
    series.mode = 'markers';
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
    const serieOptions = options.seriesOptions[serie.name] || { type: options.globalSeriesType };
    return (serieOptions.yAxis === 1) && (options.series.stacking === null);
  });

  return {
    rows, cellsInRow, cellWidth, cellHeight, xPadding, yPadding, hasX, hasY2,
  };
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
      textfont: { color: '#f5f5f5' },
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
  const useUnifiedXaxis = sortX && (options.xAxis.type === 'category') && (options.globalSeriesType !== 'box');

  let unifiedX = null;
  if (useUnifiedXaxis) {
    unifiedX = sortBy(union(...seriesList.map(s => pluck(s.data, 'x'))), identity);
  }

  return map(seriesList, (series, index) => {
    const seriesOptions = options.seriesOptions[series.name] ||
      { type: options.globalSeriesType };

    const seriesColor = getSeriesColor(seriesOptions, index);

    const plotlySeries = {
      x: [],
      y: [],
      error_y: {
        array: [],
        color: seriesColor,
      },
      name: seriesOptions.name || series.name,
      marker: { color: seriesColor },
    };

    if ((seriesOptions.yAxis === 1) && (options.series.stacking === null)) {
      plotlySeries.yaxis = 'y2';
    }

    setType(plotlySeries, seriesOptions.type, options);
    let data = series.data;
    if (sortX) {
      data = sortBy(data, 'x');
    }

    if (useUnifiedXaxis && (index === 0)) {
      const yValues = {};
      const eValues = {};

      data.forEach((row) => {
        yValues[row.x] = row.y;
        if (row.yError) {
          eValues[row.x] = row.yError;
        }
      });

      unifiedX.forEach((x) => {
        plotlySeries.x.push(normalizeValue(x));
        plotlySeries.y.push(normalizeValue(yValues[x] || null));
        if (!isUndefined(eValues[x])) {
          plotlySeries.error_y.array.push(normalizeValue(eValues[x] || null));
        }
      });
    } else {
      data.forEach((row) => {
        plotlySeries.x.push(normalizeValue(row.x));
        plotlySeries.y.push(normalizeValue(row.y));
        if (row.yError !== undefined) {
          plotlySeries.error_y.array.push(normalizeValue(row.yError));
        }
      });
    }
    if (!plotlySeries.error_y.length) {
      delete plotlySeries.error_y.length;
    }

    if (seriesOptions.type === 'bubble') {
      plotlySeries.marker = {
        size: pluck(data, 'size'),
      };
    } else if (seriesOptions.type === 'box') {
      plotlySeries.boxpoints = 'outliers';
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

function prepareStackingData(seriesList) {
  const xValues = union(...pluck(seriesList, 'x')).sort((a, b) => a - b);
  seriesList.forEach((series) => {
    series.x.sort((a, b) => a - b);

    each(xValues, (value, index) => {
      if (series.x[index] !== value) {
        series.x.splice(index, 0, value);
        series.y.splice(index, 0, null);
      }
    });
  });

  return seriesList;
}

function enableAnnotations(layout, seriesList, options) {
  if (options.annotations) {
    if (options.globalSeriesType === 'column') {
      seriesList.forEach((series) => {
        series.textposition = 'auto';
      });
    } else if (['line', 'area'].indexOf(options.globalSeriesType) >= 0) {
      layout.yaxis.showticklabels = false;

      delete layout.yaxis2;
      layout.annotations = [];
      each(seriesList, (series) => {
        delete series.yaxis;
        const leftAnnotation = {
          xref: 'paper',
          x: 0.05,
          y: first(series.y),
          xanchor: 'right',
          yanchor: 'middle',
          text: first(series.annotations),
          showarrow: false,
        };
        const rightAnnotation = {
          xref: 'paper',
          x: 0.95,
          y: last(series.y),
          xanchor: 'left',
          yanchor: 'middle',
          text: last(series.annotations),
          showarrow: false,
        };

        layout.annotations.push(leftAnnotation, rightAnnotation);
      });
    }
  }
}

function prepareDataLabels(seriesList, options) {
  seriesList.forEach((series) => {
    series.visible = true;
    series.savedY = series.y;
    series.hoverinfo = 'x+text+name';
    series.text = map(series.y, v => `Value: ${formatNumber(v)}`);
    series.annotations = map([first(series.y), last(series.y)], v => `${formatNumber(v)}`);
  });

  if (options.series.percentValues && (seriesList.length > 0)) {
    const sumOfCorrespondingPoints = map(seriesList[0].savedY, constant(0));
    each(seriesList, (series) => {
      each(series.savedY, (v, i) => {
        sumOfCorrespondingPoints[i] += Math.abs(v);
      });
    });

    each(seriesList, (series) => {
      series.y = map(series.savedY, (v, i) => Math.sign(v) * Math.abs(v) / sumOfCorrespondingPoints[i] * 100);
      series.text = map(series.y, (v, i) => [
        `Value: ${formatNumber(series.savedY[i])}`,
        '<br>',
        `Relative: ${formatPercent(v)}%`,
      ].join(''));
      series.annotations = map([first(series.y), last(series.y)], (v, i) => [
        `${formatNumber(series.savedY[i])}`,
        `(${formatPercent(v)}%)`,
      ].join(' '));
      series.savedY = series.y; // Now we don't need absolute values, only percent values will be used
    });
  }


  return seriesList;
}

export function prepareData(seriesList, options) {
  if (options.globalSeriesType === 'pie') {
    return preparePieData(seriesList, options);
  }

  const result = prepareStackingData(prepareChartData(seriesList, options));
  return prepareDataLabels(result, options);
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
    width: element.offsetWidth,
    height: element.offsetHeight,
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
      result.barmode = options.series.stacking;
    }
  }

  enableAnnotations(result, data, options);

  return result;
}

export function updateStacking(seriesList, options) {
  if (seriesList.length === 0) {
    return seriesList;
  }
  if (options.globalSeriesType === 'pie') {
    return seriesList;
  }

  if (options.series.stacking) {
    seriesList = filter(seriesList, s => s.visible);
    if (['line', 'area'].indexOf(options.globalSeriesType) >= 0) {
      // Calculate cumulative value for each x tick
      each(seriesList, (series, index, list) => {
        if (index > 0) {
          const prevSeries = list[index - 1];
          series.y = map(series.savedY, (v, i) => v + prevSeries.y[i]);
        }
      });
    }
  }
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

  const annotations = element.querySelectorAll('.annotation-text');
  if (annotations.length > 0) {
    const annotationsSize = max(map(annotations, (ann) => {
      const bounds = ann.getBoundingClientRect();
      return Math.ceil(bounds.width);
    }));
    result.l = Math.max(result.l || 0, annotationsSize);
    result.r = Math.max(result.r || 0, annotationsSize);
  }

  return result;
}

export function applyMargins(target, source) {
  let changed = false;
  each(source, (value, key) => {
    if (target[key] !== source[key]) {
      target[key] = source[key];
      changed = true;
    }
  });
  return changed;
}
