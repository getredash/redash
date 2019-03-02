import {
  isArray, isNumber, isString, isUndefined, includes, min, max, has, find,
  each, values, sortBy, identity, filter, map, extend, reduce, pick, flatten, uniq,
} from 'lodash';
import moment from 'moment';
import d3 from 'd3';
import plotlyCleanNumber from 'plotly.js/src/lib/clean_number';
import { createFormatter, formatSimpleTemplate } from '@/lib/value-format';

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

const ColorPaletteArray = values(BaseColors);

function cleanNumber(value) {
  return isUndefined(value) ? value : (plotlyCleanNumber(value) || 0.0);
}

function defaultFormatSeriesText(item) {
  let result = item['@@y'];
  if (item['@@yError'] !== undefined) {
    result = `${result} \u00B1 ${item['@@yError']}`;
  }
  if (item['@@yPercent'] !== undefined) {
    result = `${item['@@yPercent']} (${result})`;
  }
  if (item['@@size'] !== undefined) {
    result = `${result}: ${item['@@size']}`;
  }
  return result;
}

function defaultFormatSeriesTextForPie(item) {
  return item['@@yPercent'] + ' (' + item['@@y'] + ')';
}

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

function getPieHoverInfoPattern(options) {
  const hasX = /{{\s*@@x\s*}}/.test(options.textFormat);
  let result = 'text';
  if (!hasX) result += '+label';
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

export function normalizeValue(value, axisType, dateTimeFormat = 'YYYY-MM-DD HH:mm:ss') {
  if (axisType === 'datetime' && moment.utc(value).isValid()) {
    value = moment.utc(value);
  }
  if (moment.isMoment(value)) {
    return value.format(dateTimeFormat);
  }
  return value;
}

function naturalSort($a, $b) {
  if ($a === $b) {
    return 0;
  } else if ($a < $b) {
    return -1;
  }
  return 1;
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

  const hasX = includes(values(options.columnMapping), 'x');
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

  const formatNumber = createFormatter({
    displayAs: 'number',
    numberFormat: options.numberFormat,
  });
  const formatPercent = createFormatter({
    displayAs: 'number',
    numberFormat: options.percentFormat,
  });
  const formatText = options.textFormat === ''
    ? defaultFormatSeriesTextForPie :
    item => formatSimpleTemplate(options.textFormat, item);

  const hoverinfo = getPieHoverInfoPattern(options);

  // we will use this to assign colors for values that have not explicitly set color
  const getDefaultColor = d3.scale.ordinal().domain([]).range(ColorPaletteArray);
  const valuesColors = {};
  each(options.valuesOptions, (item, key) => {
    if (isString(item.color) && (item.color !== '')) {
      valuesColors[key] = item.color;
    }
  });

  return map(seriesList, (serie, index) => {
    const xPosition = (index % cellsInRow) * cellWidth;
    const yPosition = Math.floor(index / cellsInRow) * cellHeight;

    const sourceData = new Map();
    const seriesTotal = reduce(serie.data, (result, row) => {
      const y = cleanNumber(row.y);
      return result + Math.abs(y);
    }, 0);
    each(serie.data, (row) => {
      const x = normalizeValue(row.x);
      const y = cleanNumber(row.y);
      sourceData.set(x, {
        x,
        y,
        yPercent: y / seriesTotal * 100,
        raw: extend({}, row.$raw, {
          // use custom display format - see also `updateSeriesText`
          '@@x': normalizeValue(row.x, options.xAxis.type, options.dateTimeFormat),
        }),
      });
    });

    return {
      values: map(serie.data, i => i.y),
      labels: map(serie.data, row => (hasX ? normalizeValue(row.x) : `Slice ${index}`)),
      type: 'pie',
      hole: 0.4,
      marker: {
        colors: map(serie.data, row => valuesColors[row.x] || getDefaultColor(row.x)),
      },
      hoverinfo,
      text: [],
      textinfo: options.showDataLabels ? 'percent' : 'none',
      textposition: 'inside',
      textfont: { color: '#ffffff' },
      name: serie.name,
      domain: {
        x: [xPosition, xPosition + cellWidth - xPadding],
        y: [yPosition, yPosition + cellHeight - yPadding],
      },
      sourceData,
      formatNumber,
      formatPercent,
      formatText,
    };
  });
}

function prepareHeatmapData(seriesList, options) {
  const defaultColorScheme = [
    [0, '#356aff'],
    [0.14, '#4a7aff'],
    [0.28, '#5d87ff'],
    [0.42, '#7398ff'],
    [0.56, '#fb8c8c'],
    [0.71, '#ec6463'],
    [0.86, '#ec4949'],
    [1, '#e92827'],
  ];

  const formatNumber = createFormatter({
    displayAs: 'number',
    numberFormat: options.numberFormat,
  });

  let colorScheme = [];

  if (!options.colorScheme) {
    colorScheme = defaultColorScheme;
  } else if (options.colorScheme === 'Custom...') {
    colorScheme = [[0, options.heatMinColor], [1, options.heatMaxColor]];
  } else {
    colorScheme = options.colorScheme;
  }

  return map(seriesList, (series) => {
    const plotlySeries = {
      x: [],
      y: [],
      z: [],
      type: 'heatmap',
      name: '',
      colorscale: colorScheme,
    };

    plotlySeries.x = uniq(map(series.data, 'x'));
    plotlySeries.y = uniq(map(series.data, 'y'));

    if (options.sortX) {
      plotlySeries.x.sort(naturalSort);
    }

    if (options.sortY) {
      plotlySeries.y.sort(naturalSort);
    }

    if (options.reverseX) {
      plotlySeries.x.reverse();
    }

    if (options.reverseY) {
      plotlySeries.y.reverse();
    }

    const zMax = max(map(series.data, 'zVal'));

    // Use text trace instead of default annotation for better performance
    const dataLabels = {
      x: [],
      y: [],
      mode: 'text',
      hoverinfo: 'skip',
      showlegend: false,
      text: [],
      textfont: {
        color: [],
      },
    };

    for (let i = 0; i < plotlySeries.y.length; i += 1) {
      const item = [];
      for (let j = 0; j < plotlySeries.x.length; j += 1) {
        const datum = find(
          series.data,
          { x: plotlySeries.x[j], y: plotlySeries.y[i] },
        );

        const zValue = datum ? datum.zVal : 0;
        item.push(zValue);

        if (isFinite(zMax) && options.showDataLabels) {
          dataLabels.x.push(plotlySeries.x[j]);
          dataLabels.y.push(plotlySeries.y[i]);
          dataLabels.text.push(formatNumber(zValue));
          if (options.colorScheme && options.colorScheme === 'Custom...') {
            dataLabels.textfont.color.push('white');
          } else {
            dataLabels.textfont.color.push((zValue / zMax) < 0.25 ? 'white' : 'black');
          }
        }
      }
      plotlySeries.z.push(item);
    }

    if (isFinite(zMax) && options.showDataLabels) {
      return [plotlySeries, dataLabels];
    }
    return [plotlySeries];
  });
}

function prepareChartData(seriesList, options) {
  const sortX = (options.sortX === true) || (options.sortX === undefined);

  const formatNumber = createFormatter({
    displayAs: 'number',
    numberFormat: options.numberFormat,
  });
  const formatPercent = createFormatter({
    displayAs: 'number',
    numberFormat: options.percentFormat,
  });
  const formatText = options.textFormat === ''
    ? defaultFormatSeriesText :
    item => formatSimpleTemplate(options.textFormat, item);

  const hoverinfo = getHoverInfoPattern(options);

  return map(seriesList, (series, index) => {
    const seriesOptions = options.seriesOptions[series.name] ||
      { type: options.globalSeriesType };

    const seriesColor = getSeriesColor(seriesOptions, index);

    // Sort by x - `Map` preserves order of items
    const data = sortX ? sortBy(series.data, d => normalizeValue(d.x, options.xAxis.type)) : series.data;

    // For bubble/scatter charts `y` may be any (similar to `x`) - numeric is only bubble size;
    // for other types `y` is always number
    const cleanYValue = includes(['bubble', 'scatter'], seriesOptions.type) ? normalizeValue : cleanNumber;

    const sourceData = new Map();
    const xValues = [];
    const yValues = [];
    const yErrorValues = [];
    each(data, (row) => {
      const x = normalizeValue(row.x, options.xAxis.type); // number/datetime/category
      const y = cleanYValue(row.y, options.yAxis[0].type); // depends on series type!
      const yError = cleanNumber(row.yError); // always number
      const size = cleanNumber(row.size); // always number
      sourceData.set(x, {
        x,
        y,
        yError,
        size,
        yPercent: null, // will be updated later
        raw: extend({}, row.$raw, {
          // use custom display format - see also `updateSeriesText`
          '@@x': normalizeValue(row.x, options.xAxis.type, options.dateTimeFormat),
        }),
      });
      xValues.push(x);
      yValues.push(y);
      yErrorValues.push(yError);
    });

    const plotlySeries = {
      visible: true,
      hoverinfo,
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
      formatNumber,
      formatPercent,
      formatText,
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
        color: seriesColor,
        size: map(data, i => i.size),
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
  if (options.globalSeriesType === 'heatmap') {
    return flatten(prepareHeatmapData(seriesList, options));
  }
  return prepareChartData(seriesList, options);
}

export function prepareLayout(element, seriesList, options, data) {
  const {
    cellsInRow, cellWidth, cellHeight, xPadding, hasY2,
  } = calculateDimensions(seriesList, options);

  const result = {
    margin: {
      l: 10,
      r: 10,
      b: 10,
      t: 25,
      pad: 4,
    },
    width: Math.floor(element.offsetWidth),
    height: Math.floor(element.offsetHeight),
    autosize: true,
    showlegend: has(options, 'legend') ? options.legend.enabled : true,
  };

  if (options.globalSeriesType === 'pie') {
    const hasName = /{{\s*@@name\s*}}/.test(options.textFormat);

    if (hasName) {
      result.annotations = [];
    } else {
      result.annotations = filter(map(seriesList, (series, index) => {
        const xPosition = (index % cellsInRow) * cellWidth;
        const yPosition = Math.floor(index / cellsInRow) * cellHeight;
        return {
          x: xPosition + ((cellWidth - xPadding) / 2),
          y: yPosition + cellHeight - 0.015,
          xanchor: 'center',
          yanchor: 'top',
          text: options.seriesOptions[series.name].name || series.name,
          showarrow: false,
        };
      }));
    }
  } else {
    if (options.globalSeriesType === 'box') {
      result.boxmode = 'group';
      result.boxgroupgap = 0.50;
    }

    result.xaxis = {
      title: getTitle(options.xAxis),
      type: getScaleType(options.xAxis.type),
      automargin: true,
    };

    if (options.sortX && result.xaxis.type === 'category') {
      if (options.reverseX) {
        result.xaxis.categoryorder = 'category descending';
      } else {
        result.xaxis.categoryorder = 'category ascending';
      }
    }

    if (!isUndefined(options.xAxis.labels)) {
      result.xaxis.showticklabels = options.xAxis.labels.enabled;
    }

    if (isArray(options.yAxis)) {
      result.yaxis = {
        title: getTitle(options.yAxis[0]),
        type: getScaleType(options.yAxis[0].type),
        automargin: true,
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
        automargin: true,
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
    const seriesOptions = options.seriesOptions[series.name] ||
      { type: options.globalSeriesType };

    series.text = [];
    series.hover = [];
    const xValues = (options.globalSeriesType === 'pie') ? series.labels : series.x;
    xValues.forEach((x) => {
      const text = {
        '@@name': series.name,
        // '@@x' is already in `item.$raw`
      };
      const item = series.sourceData.get(x);
      if (item) {
        text['@@y'] = includes(['bubble', 'scatter'], seriesOptions.type) ? item.y : series.formatNumber(item.y);
        if (item.yError !== undefined) {
          text['@@yError'] = series.formatNumber(item.yError);
        }
        if (item.size !== undefined) {
          text['@@size'] = series.formatNumber(item.size);
        }

        if (options.series.percentValues || (options.globalSeriesType === 'pie')) {
          text['@@yPercent'] = series.formatPercent(Math.abs(item.yPercent));
        }

        extend(text, item.raw);
      }

      series.text.push(series.formatText(text));
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
    updateSeriesText(seriesList, options);
    return seriesList;
  }
  if (options.globalSeriesType === 'heatmap') {
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

function fixLegendContainer(plotlyElement) {
  const legend = plotlyElement.querySelector('.legend');
  if (legend) {
    let node = legend.parentNode;
    while (node) {
      if (node.tagName.toLowerCase() === 'svg') {
        node.style.overflow = 'visible';
        break;
      }
      node = node.parentNode;
    }
  }
}

export function updateLayout(plotlyElement, layout, updatePlot) {
  // update layout size to plot container
  layout.width = Math.floor(plotlyElement.offsetWidth);
  layout.height = Math.floor(plotlyElement.offsetHeight);

  const transformName = find([
    'transform',
    'webkitTransform',
    'mozTransform',
    'msTransform',
    'oTransform',
  ], prop => has(plotlyElement.style, prop));

  if (layout.width <= 600) {
    // change legend orientation to horizontal; plotly has a bug with this
    // legend alignment - it does not preserve enough space under the plot;
    // so we'll hack this: update plot (it will re-render legend), compute
    // legend height, reduce plot size by legend height (but not less than
    // half of plot container's height - legend will have max height equal to
    // plot height), re-render plot again and offset legend to the space under
    // the plot.
    layout.legend = {
      orientation: 'h',
      // locate legend inside of plot area - otherwise plotly will preserve
      // some amount of space under the plot; also this will limit legend height
      // to plot's height
      y: 0,
      x: 0,
      xanchor: 'left',
      yanchor: 'bottom',
    };

    // set `overflow: visible` to svg containing legend because later we will
    // position legend outside of it
    fixLegendContainer(plotlyElement);

    updatePlot(plotlyElement, pick(layout, ['width', 'height', 'legend'])).then(() => {
      const legend = plotlyElement.querySelector('.legend'); // eslint-disable-line no-shadow
      if (legend) {
        // compute real height of legend - items may be split into few columnns,
        // also scrollbar may be shown
        const bounds = reduce(legend.querySelectorAll('.traces'), (result, node) => {
          const b = node.getBoundingClientRect();
          result = result || b;
          return {
            top: Math.min(result.top, b.top),
            bottom: Math.max(result.bottom, b.bottom),
          };
        }, null);
        // here we have two values:
        // 1. height of plot container excluding height of legend items;
        //    it may be any value between 0 and plot container's height;
        // 2. half of plot containers height. Legend cannot be larger than
        //    plot; if legend is too large, plotly will reduce it's height and
        //    show a scrollbar; in this case, height of plot === height of legend,
        //    so we can split container's height half by half between them.
        layout.height = Math.floor(Math.max(
          layout.height / 2,
          layout.height - (bounds.bottom - bounds.top),
        ));
        // offset the legend
        legend.style[transformName] = 'translate(0, ' + layout.height + 'px)';
        updatePlot(plotlyElement, pick(layout, ['height']));
      }
    });
  } else {
    layout.legend = {
      orientation: 'v',
      // vertical legend will be rendered properly, so just place it to the right
      // side of plot
      y: 1,
      x: 1,
      xanchor: 'left',
      yanchor: 'top',
    };

    const legend = plotlyElement.querySelector('.legend');
    if (legend) {
      legend.style[transformName] = null;
    }

    updatePlot(plotlyElement, pick(layout, ['width', 'height', 'legend']));
  }
}
