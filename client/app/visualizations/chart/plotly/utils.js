import {
  isArray, isNumber, isUndefined, contains, min, max, has, find,
  each, values, sortBy, union, pluck, identity, filter, map,
} from 'underscore';
import moment from 'moment';

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

const ColorPaletteArray = values(BaseColors);

function fillXValues(seriesList) {
  const xValues = sortBy(union(...pluck(seriesList, 'x')), identity);
  seriesList.forEach((series) => {
    series.x = sortBy(series.x, identity);

    each(xValues, (value, index) => {
      if (series.x[index] !== value) {
        series.x.splice(index, 0, value);
        series.y.splice(index, 0, null);
      }
    });
  });
}

function storeOriginalHeightForEachSeries(seriesList) {
  seriesList.forEach((series) => {
    if (!has(series, 'visible')) {
      series.visible = true;
      series.original_y = series.y.slice();
    }
  });
}

function getEnabledSeries(seriesList) {
  return seriesList.filter(series => series.visible === true);
}

function initializeTextAndHover(seriesList) {
  seriesList.forEach((series) => {
    series.text = [];
    series.hoverinfo = 'text+name';
  });
}

export function normalAreaStacking(seriesList) {
  fillXValues(seriesList);
  storeOriginalHeightForEachSeries(seriesList);
  initializeTextAndHover(seriesList);

  const enabledSeriesList = getEnabledSeries(seriesList);

  each(enabledSeriesList, (series, seriesIndex, list) => {
    each(series.y, (_, yIndex) => {
      const cumulativeHeightOfPreviousSeries =
        seriesIndex > 0 ? list[seriesIndex - 1].y[yIndex] : 0;
      const cumulativeHeightWithThisSeries =
        cumulativeHeightOfPreviousSeries + series.original_y[yIndex];

      series.y[yIndex] = cumulativeHeightWithThisSeries;
      series.text.push(`Value: ${series.original_y[yIndex]}<br>Sum: ${cumulativeHeightWithThisSeries}`);
    });
  });
}

function lastVisibleY(seriesList, lastSeriesIndex, yIndex) {
  for (let i = lastSeriesIndex; i >= 0; i -= 1) {
    if (seriesList[i].visible === true) {
      return seriesList[i].y[yIndex];
    }
  }
  return 0;
}

export function percentAreaStacking(seriesList) {
  if (seriesList.length === 0) {
    return;
  }
  fillXValues(seriesList);
  storeOriginalHeightForEachSeries(seriesList);
  initializeTextAndHover(seriesList);

  each(seriesList[0].y, (seriesY, yIndex) => {
    const sumOfCorrespondingDataPoints = seriesList.reduce(
      (total, series) => total + series.original_y[yIndex],
      0,
    );

    each(seriesList, (series, seriesIndex) => {
      const percentage = (series.original_y[yIndex] / sumOfCorrespondingDataPoints) * 100;
      const previousVisiblePercentage = lastVisibleY(seriesList, seriesIndex - 1, yIndex);
      series.y[yIndex] = percentage + previousVisiblePercentage;
      series.text.push(`Value: ${series.original_y[yIndex]}<br>Relative: ${percentage.toFixed(2)}%`);
    });
  });
}

function percentBarStacking(seriesList) {
  if (seriesList.length === 0) {
    return;
  }
  fillXValues(seriesList);
  initializeTextAndHover(seriesList);

  for (let i = 0; i < seriesList[0].y.length; i += 1) {
    let sum = 0;
    for (let j = 0; j < seriesList.length; j += 1) {
      sum += seriesList[j].y[i];
    }
    for (let j = 0; j < seriesList.length; j += 1) {
      const value = seriesList[j].y[i] / sum * 100;
      seriesList[j].text.push(`Value: ${seriesList[j].y[i]}<br>Relative: ${value.toFixed(2)}%`);
      seriesList[j].y[i] = value;
    }
  }
}

export function normalizeValue(value) {
  if (moment.isMoment(value)) {
    return value.format('YYYY-MM-DD HH:mm:ss');
  }
  return value;
}

function seriesMinValue(series) {
  return min(series.map(s => min(s.y)));
}

function seriesMaxValue(series) {
  return max(series.map(s => max(s.y)));
}

function leftAxisSeries(series) {
  return series.filter(s => s.yaxis !== 'y2');
}

function rightAxisSeries(series) {
  return series.filter(s => s.yaxis === 'y2');
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

function getColor(index) {
  return ColorPaletteArray[index % ColorPaletteArray.length];
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
    return (serieOptions.yAxis === 1) && ((options.series.stacking === null) || (serieOptions.type === 'line'));
  });

  return {
    rows, cellsInRow, cellWidth, cellHeight, xPadding, yPadding, hasX, hasY2,
  };
}

export function prepareData(series, options) {
  const {
    cellWidth, cellHeight, xPadding, yPadding, cellsInRow, hasX,
  } = calculateDimensions(series, options);

  if (options.globalSeriesType === 'pie') {
    return map(series, (serie, index) => {
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

  const sortX = (options.sortX === true) || (options.sortX === undefined);
  const useUnifiedXaxis = sortX && (options.xAxis.type === 'category') && (options.globalSeriesType !== 'box');

  let unifiedX = null;
  if (useUnifiedXaxis) {
    unifiedX = sortBy(union(...series.map(s => pluck(s.data, 'x'))), identity);
  }

  return map(series, (serie, index) => {
    const serieOptions = options.seriesOptions[serie.name] ||
      { type: options.globalSeriesType };

    const seriesColor = serieOptions.color ? serieOptions.color : getColor(index);

    const plotlySeries = {
      x: [],
      y: [],
      error_y: {
        array: [],
        color: seriesColor,
      },
      name: serieOptions.name || serie.name,
      marker: { color: seriesColor },
    };

    setType(plotlySeries, serieOptions.type, options);
    let data = serie.data;
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

    if (serieOptions.type === 'bubble') {
      plotlySeries.marker = {
        size: pluck(data, 'size'),
      };
    } else if (serieOptions.type === 'box') {
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

export function prepareLayout(element, series, options, data) {
  const {
    cellsInRow, cellWidth, cellHeight, xPadding, hasY2,
  } = calculateDimensions(series, options);

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
    result.annotations = filter(map(series, (serie, index) => {
      const xPosition = (index % cellsInRow) * cellWidth;
      const yPosition = Math.floor(index / cellsInRow) * cellHeight;
      return {
        x: xPosition + ((cellWidth - xPadding) / 2),
        y: yPosition + cellHeight - 0.015,
        xanchor: 'center',
        yanchor: 'top',
        text: serie.name,
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

      if (isNumber(options.yAxis[0].rangeMin) ||
        isNumber(options.yAxis[0].rangeMax)) {
        const minY = options.yAxis[0].rangeMin ||
          Math.min(0, seriesMinValue(leftAxisSeries(data)));
        const maxY = options.yAxis[0].rangeMax ||
          seriesMaxValue(leftAxisSeries(data));

        result.yaxis.range = [minY, maxY];
      }
    }

    if (hasY2 && !isUndefined(options.yAxis)) {
      result.yaxis2 = {
        title: getTitle(options.yAxis[1]),
        type: getScaleType(options.yAxis[1].type),
        overlaying: 'y',
        side: 'right',
      };

      if (isNumber(options.yAxis[1].rangeMin) ||
        isNumber(options.yAxis[1].rangeMax)) {
        const minY = options.yAxis[1].rangeMin ||
          Math.min(0, seriesMinValue(rightAxisSeries(data)));
        const maxY = options.yAxis[1].rangeMax ||
          seriesMaxValue(rightAxisSeries(data));

        result.yaxis2.range = [minY, maxY];
      }
    }

    if (options.series.stacking === 'normal') {
      result.barmode = 'stack';
      if (options.globalSeriesType === 'area') {
        normalAreaStacking(data);
      }
    } else if (options.series.stacking === 'percent') {
      result.barmode = 'stack';
      if (options.globalSeriesType === 'area') {
        percentAreaStacking(data);
      } else if (options.globalSeriesType === 'column') {
        percentBarStacking(data);
      }
    }
  }

  return result;
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
