import { isEmpty, isEqual, isArray, isNumber, isUndefined, contains, min, max, has, each, values, sortBy, union, pluck, identity } from 'underscore';
import d3 from 'd3';
import Plotly from 'plotly.js/lib/core';
import bar from 'plotly.js/lib/bar';
import pie from 'plotly.js/lib/pie';
import histogram from 'plotly.js/lib/histogram';
import box from 'plotly.js/lib/box';

import moment from 'moment';

Plotly.register([bar, pie, histogram, box]);
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ['sendDataToCloud'],
});

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
const ColorPalette = Object.assign({}, BaseColors, {
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

function normalAreaStacking(seriesList) {
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

function percentAreaStacking(seriesList) {
  if (seriesList.length === 0) {
    return;
  }
  fillXValues(seriesList);
  storeOriginalHeightForEachSeries(seriesList);
  initializeTextAndHover(seriesList);

  each(seriesList[0].y, (seriesY, yIndex) => {
    const sumOfCorrespondingDataPoints = seriesList.reduce((total, series) =>
       total + series.original_y[yIndex]
    , 0);

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

function normalizeValue(value) {
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

const PlotlyChart = () => {
  let bottomMargin = 50;
  return {
    restrict: 'E',
    template: '<div></div>',
    scope: {
      options: '=',
      series: '=',
      height: '=',
    },
    link(scope, element) {
      function calculateHeight() {
        const height = Math.max(scope.height, (scope.height - 50) + bottomMargin);
        if (scope.options.globalSeriesType === 'box') {
          return scope.options.height || height;
        }
        return height;
      }

      function setType(series, type) {
        if (type === 'column') {
          series.type = 'bar';
        } else if (type === 'line') {
          series.mode = 'lines';
        } else if (type === 'area') {
          series.fill = scope.options.series.stacking === null ? 'tozeroy' : 'tonexty';
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

      function getTitle(axis) {
        if (!isUndefined(axis) && !isUndefined(axis.title)) {
          return axis.title.text;
        }
        return null;
      }


      function recalculateOptions() {
        scope.data.length = 0;
        scope.layout.showlegend = has(scope.options, 'legend') ? scope.options.legend.enabled : true;
        if (has(scope.options, 'bottomMargin')) {
          bottomMargin = parseInt(scope.options.bottomMargin, 10);
          scope.layout.margin.b = bottomMargin;
        }
        delete scope.layout.barmode;
        delete scope.layout.xaxis;
        delete scope.layout.yaxis;
        delete scope.layout.yaxis2;

        if (scope.options.globalSeriesType === 'pie') {
          const hasX = contains(values(scope.options.columnMapping), 'x');
          const rows = scope.series.length > 2 ? 2 : 1;
          const cellsInRow = Math.ceil(scope.series.length / rows);
          const cellWidth = 1 / cellsInRow;
          const cellHeight = 1 / rows;
          const xPadding = 0.02;
          const yPadding = 0.05;

          each(scope.series, (series, index) => {
            const xPosition = (index % cellsInRow) * cellWidth;
            const yPosition = Math.floor(index / cellsInRow) * cellHeight;
            const plotlySeries = {
              values: [],
              labels: [],
              type: 'pie',
              hole: 0.4,
              marker: { colors: ColorPaletteArray },
              text: series.name,
              textposition: 'inside',
              name: series.name,
              domain: {
                x: [xPosition, xPosition + cellWidth - xPadding],
                y: [yPosition, yPosition + cellHeight - yPadding],
              },
            };

            series.data.forEach((row) => {
              plotlySeries.values.push(row.y);
              plotlySeries.labels.push(hasX ? row.x : `Slice ${index}`);
            });

            scope.data.push(plotlySeries);
          });
          return;
        }

        if (scope.options.globalSeriesType === 'box') {
          scope.options.sortX = false;
          scope.layout.boxmode = 'group';
          scope.layout.boxgroupgap = 0.50;
        }

        let hasY2 = false;
        const sortX = scope.options.sortX === true || scope.options.sortX === undefined;
        const useUnifiedXaxis = sortX && scope.options.xAxis.type === 'category';

        let unifiedX = null;
        if (useUnifiedXaxis) {
          unifiedX = sortBy(union(...scope.series.map(s => pluck(s.data, 'x'))), identity);
        }

        each(scope.series, (series, index) => {
          const seriesOptions = scope.options.seriesOptions[series.name] ||
            { type: scope.options.globalSeriesType };

          const plotlySeries = {
            x: [],
            y: [],
            error_y: { array: [] },
            name: seriesOptions.name || series.name,
            marker: { color: seriesOptions.color ? seriesOptions.color : getColor(index) },
          };

          if (seriesOptions.yAxis === 1 && (scope.options.series.stacking === null || seriesOptions.type === 'line')) {
            hasY2 = true;
            plotlySeries.yaxis = 'y2';
          }

          setType(plotlySeries, seriesOptions.type);
          let data = series.data;
          if (sortX) {
            data = sortBy(data, 'x');
          }

          if (useUnifiedXaxis && index === 0) {
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
              if (row.yError) {
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
          }

          if (seriesOptions.type === 'box') {
            plotlySeries.boxpoints = 'outliers';
            plotlySeries.marker = {
              size: 3,
            };
            if (scope.options.showpoints) {
              plotlySeries.boxpoints = 'all';
              plotlySeries.jitter = 0.3;
              plotlySeries.pointpos = -1.8;
              plotlySeries.marker = {
                size: 3,
              };
            }
          }

          scope.data.push(plotlySeries);
        });

        scope.layout.xaxis = {
          title: getTitle(scope.options.xAxis),
          type: getScaleType(scope.options.xAxis.type),
        };

        if (!isUndefined(scope.options.xAxis.labels)) {
          scope.layout.xaxis.showticklabels = scope.options.xAxis.labels.enabled;
        }

        if (isArray(scope.options.yAxis)) {
          scope.layout.yaxis = {
            title: getTitle(scope.options.yAxis[0]),
            type: getScaleType(scope.options.yAxis[0].type),
          };

          if (isNumber(scope.options.yAxis[0].rangeMin) ||
              isNumber(scope.options.yAxis[0].rangeMax)) {
            const minY = scope.options.yAxis[0].rangeMin ||
              Math.min(0, seriesMinValue(leftAxisSeries(scope.data)));
            const maxY = scope.options.yAxis[0].rangeMax ||
              seriesMaxValue(leftAxisSeries(scope.data));

            scope.layout.yaxis.range = [minY, maxY];
          }
        }
        if (hasY2 && !isUndefined(scope.options.yAxis)) {
          scope.layout.yaxis2 = {
            title: getTitle(scope.options.yAxis[1]),
            type: getScaleType(scope.options.yAxis[1].type),
            overlaying: 'y',
            side: 'right',
          };

          if (isNumber(scope.options.yAxis[1].rangeMin) ||
              isNumber(scope.options.yAxis[1].rangeMax)) {
            const minY = scope.options.yAxis[1].rangeMin ||
              Math.min(0, seriesMinValue(rightAxisSeries(scope.data)));
            const maxY = scope.options.yAxis[1].rangeMax ||
              seriesMaxValue(rightAxisSeries(scope.data));

            scope.layout.yaxis2.range = [minY, maxY];
          }
        } else {
          delete scope.layout.yaxis2;
        }

        if (scope.options.series.stacking === 'normal') {
          scope.layout.barmode = 'stack';
          if (scope.options.globalSeriesType === 'area') {
            normalAreaStacking(scope.data);
          }
        } else if (scope.options.series.stacking === 'percent') {
          scope.layout.barmode = 'stack';
          if (scope.options.globalSeriesType === 'area') {
            percentAreaStacking(scope.data);
          } else if (scope.options.globalSeriesType === 'column') {
            percentBarStacking(scope.data);
          }
        }

        scope.layout.margin.b = bottomMargin;
        scope.layout.height = calculateHeight();
      }

      scope.$watch('series', recalculateOptions);
      scope.$watch('options', recalculateOptions, true);

      scope.layout = {
        margin: { l: 50, r: 50, b: bottomMargin, t: 20, pad: 4 },
        height: calculateHeight(),
        autosize: true,
      };
      scope.plotlyOptions = { showLink: false, displaylogo: false };
      scope.data = [];

      const plotlyElement = element[0].children[0];
      Plotly.newPlot(plotlyElement, scope.data, scope.layout, scope.plotlyOptions);

      plotlyElement.on('plotly_afterplot', () => {
        if (scope.options.globalSeriesType === 'area' && (scope.options.series.stacking === 'normal' || scope.options.series.stacking === 'percent')) {
          document.querySelectorAll('.legendtoggle').forEach((rectDiv, i) => {
            d3.select(rectDiv).on('click', () => {
              const maxIndex = scope.data.length - 1;
              const itemClicked = scope.data[maxIndex - i];

              itemClicked.visible = (itemClicked.visible === true) ? 'legendonly' : true;
              if (scope.options.series.stacking === 'normal') {
                normalAreaStacking(scope.data);
              } else if (scope.options.series.stacking === 'percent') {
                percentAreaStacking(scope.data);
              }
              Plotly.redraw(plotlyElement);
            });
          });
        }
      });
      scope.$watch('layout', (layout, old) => {
        if (isEqual(layout, old)) {
          return;
        }
        Plotly.relayout(plotlyElement, layout);
      }, true);

      scope.$watch('data', (data) => {
        if (!isEmpty(data)) {
          Plotly.redraw(plotlyElement);
        }
      }, true);
    },
  };
};

const CustomPlotlyChart = (clientConfig) => {
  const customChart = {
    restrict: 'E',
    template: '<div></div>',
    scope: {
      series: '=',
      options: '=',
      height: '=',
    },
    link(scope, element) {
      if (!clientConfig.allowCustomJSVisualizations) {
        return;
      }
      const refresh = () => {
        // Clear existing data with blank data for succeeding codeCall adds data to existing plot.
        Plotly.newPlot(element[0].children[0]);

        // eslint-disable-next-line no-eval
        const codeCall = eval(`codeCall = function(x, ys, element, Plotly){ ${scope.options.customCode} }`);
        codeCall(scope.x, scope.ys, element[0].children[0], Plotly);
      };
      const timeSeriesToPlotlySeries = () => {
        scope.x = [];
        scope.ys = {};
        each(scope.series, (series) => {
          scope.ys[series.name] = [];
          each(series.data, (point) => {
            scope.x.push(normalizeValue(point.x));
            scope.ys[series.name].push(normalizeValue(point.y));
          });
        });
      };
      scope.$watch('[options.customCode, options.autoRedraw]', () => {
        try {
          if (scope.options.autoRedraw) {
            refresh();
          }
        } catch (err) {
          if (scope.options.enableConsoleLogs) {
            // eslint-disable-next-line no-console
            console.log(`Error while executing custom graph: ${err}`);
          }
        }
      }, true);
      scope.$watch('series', () => {
        timeSeriesToPlotlySeries();
        refresh();
      }, true);
    },
  };
  return customChart;
};

export default function (ngModule) {
  ngModule.constant('ColorPalette', ColorPalette);
  ngModule.directive('plotlyChart', PlotlyChart);
  ngModule.directive('customPlotlyChart', CustomPlotlyChart);
}
