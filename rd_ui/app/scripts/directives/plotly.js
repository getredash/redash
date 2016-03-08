(function () {
  'use strict';

  var ColorPalette = {
    'Blue': '#4572A7',
    'Red': '#AA4643',
    'Green': '#89A54E',
    'Purple': '#80699B',
    'Cyan': '#3D96AE',
    'Orange': '#DB843D',
    'Light Blue': '#92A8CD',
    'Lilac': '#A47D7C',
    'Light Green': '#B5CA92',
    'Brown': '#A52A2A',
    'Black': '#000000',
    'Gray': '#808080',
    'Pink': '#FFC0CB',
    'Dark Blue': '#00008b'
  };

  var ColorPaletteArray = _.values(ColorPalette);

  var fillXValues = function(seriesList) {
    var xValues = _.sortBy(_.union.apply(_, _.pluck(seriesList, 'x')), _.identity);
    _.each(seriesList, function(series) {
      series.x = _.sortBy(series.x, _.identity);

      _.each(xValues, function(value, index) {
        if (series.x[index] !== value) {
          series.x.splice(index, 0, value);
          series.y.splice(index, 0, null);
        }
      });
    });
  };

  var normalAreaStacking = function(seriesList) {
    fillXValues(seriesList);
    _.each(seriesList, function(series) {
      series.text = [];
      series.hoverinfo = 'text+name';
    });
    for (var i = 0; i < seriesList.length; i++) {
      for (var j = 0; j < seriesList[i].y.length; j++) {
        var sum = i > 0 ? seriesList[i-1].y[j] : 0;
        seriesList[i].text.push('Value: ' + seriesList[i].y[j] + '<br>Sum: ' + (sum + seriesList[i].y[j]));
        seriesList[i].y[j] += sum;
      }
    }
  };

  var percentAreaStacking = function(seriesList) {
    if (seriesList.length === 0) {
      return;
    }

    fillXValues(seriesList);
    _.each(seriesList, function(series) {
      series.text = [];
      series.hoverinfo = 'text+name';
    });
    for (var i = 0; i < seriesList[0].y.length; i++) {
      var sum = 0;
      for(var j = 0; j < seriesList.length; j++) {
        sum += seriesList[j].y[i];
      }

      for(var j = 0; j < seriesList.length; j++) {
        var value = seriesList[j].y[i] / sum * 100;
        seriesList[j].text.push('Value: ' + seriesList[j].y[i] + '<br>Relative: ' + value.toFixed(2) + '%');

        seriesList[j].y[i] = value;
        if (j > 0) {
          seriesList[j].y[i] += seriesList[j-1].y[i];
        }
      }
    }
  };

  var percentBarStacking = function(seriesList) {
    if (seriesList.length === 0) {
      return;
    }

    fillXValues(seriesList);
    _.each(seriesList, function(series) {
      series.text = [];
      series.hoverinfo = 'text+name';
    });
    for (var i = 0; i < seriesList[0].y.length; i++) {
      var sum = 0;
      for(var j = 0; j < seriesList.length; j++) {
        sum += seriesList[j].y[i];
      }
      for(var j = 0; j < seriesList.length; j++) {
        var value = seriesList[j].y[i] / sum * 100;
        seriesList[j].text.push('Value: ' + seriesList[j].y[i] + '<br>Relative: ' + value.toFixed(2) + '%');
        seriesList[j].y[i] = value;
      }
    }
  }

  var normalizeValue = function(value) {
    if (moment.isMoment(value)) {
      return value.format("YYYY-MM-DD HH:mm:ss");
    }
    return value;
  }

  angular.module('plotly-chart', [])
    .constant('ColorPalette', ColorPalette)
    .directive('plotlyChart', function () {
      return {
        restrict: 'E',
        template: '<plotly data="data" layout="layout" options="plotlyOptions"></plotly>',
        scope: {
          options: "=",
          series: "=",
          minHeight: "="
        },
        link: function (scope) {
          var getScaleType = function(scale) {
            if (scale === 'datetime') {
              return 'date';
            }
            if (scale === 'logarithmic') {
              return 'log';
            }
            return scale;
          };

          var setType = function(series, type) {
            if (type === 'column') {
              series.type = 'bar';
            } else  if (type === 'line') {
              series.mode = 'lines';
            } else if (type === 'area') {
              series.fill = scope.options.series.stacking === null ? 'tozeroy' : 'tonexty';
              series.mode = 'lines';
            } else if (type === 'scatter') {
              series.type = 'scatter';
              series.mode = 'markers';
            }
          };

          var getColor = function(index) {
            return ColorPaletteArray[index % ColorPaletteArray.length];
          };

          var bottomMargin = 50,
              pixelsPerLegendRow = 21;
          var redraw = function() {
            scope.data.length = 0;
            scope.layout.showlegend = _.has(scope.options, 'legend') ? scope.options.legend.enabled : true;
            delete scope.layout.barmode;
            delete scope.layout.xaxis;
            delete scope.layout.yaxis;
            delete scope.layout.yaxis2;

            if (scope.options.globalSeriesType === 'pie') {
              var hasX = _.contains(_.values(scope.options.columnMapping), 'x');
              var rows = scope.series.length > 2 ? 2 : 1;
              var cellsInRow = Math.ceil(scope.series.length / rows);
              var cellWidth = 1 / cellsInRow;
              var cellHeight = 1 / rows;
              var xPadding = 0.02;
              var yPadding = 0.05;
              var largestXCount = 0;
              _.each(scope.series, function(series, index) {
                var xPosition = (index % cellsInRow) * cellWidth;
                var yPosition = Math.floor(index / cellsInRow) * cellHeight;
                var plotlySeries = {values: [], labels: [], type: 'pie', hole: .4,
                                    marker: {colors: ColorPaletteArray},
                                    text: series.name, textposition: 'inside', name: series.name,
                                    domain: {x: [xPosition, xPosition + cellWidth - xPadding],
                                             y: [yPosition, yPosition + cellHeight - yPadding]}};
                _.each(series.data, function(row, index) {
                  plotlySeries.values.push(row.y);
                  plotlySeries.labels.push(hasX ? row.x : 'Slice ' + index);
                });
                scope.data.push(plotlySeries);
                largestXCount = Math.max(largestXCount, plotlySeries.labels.length);
              });
              scope.layout.height = Math.max(scope.minHeight, pixelsPerLegendRow * largestXCount);
              scope.layout.margin.b = scope.layout.height - (scope.minHeight - bottomMargin);
              return;
            }

            scope.layout.height = Math.max(scope.minHeight, pixelsPerLegendRow * scope.series.length);
            scope.layout.margin.b = scope.layout.height - (scope.minHeight - bottomMargin);
            var hasY2 = false;
            var sortX = scope.options.sortX === true || scope.options.sortX === undefined;
            var useUnifiedXaxis = sortX && scope.options.xAxis.type === 'category';

            var unifiedX = null;
            if (useUnifiedXaxis) {
              unifiedX = _.sortBy(_.union.apply(_, _.map(scope.series, function(s) { return _.pluck(s.data, 'x'); })), _.identity);
            }

            _.each(scope.series, function(series, index) {
              var seriesOptions = scope.options.seriesOptions[series.name] || {};
              var plotlySeries = {x: [],
                                  y: [],
                                  name: seriesOptions.name || series.name,
                                  marker: {color: seriesOptions.color ? seriesOptions.color : getColor(index)}};

              if (seriesOptions.yAxis === 1 && (scope.options.series.stacking === null || seriesOptions.type === 'line')) {
                hasY2 = true;
                plotlySeries.yaxis = 'y2';
              }

              setType(plotlySeries, seriesOptions.type);
              var data = series.data;
              if (sortX) {
                data = _.sortBy(data, 'x');
              }

              if (useUnifiedXaxis && index === 0) {
                var values = {};
                _.each(data, function(row) {
                  values[row.x] = row.y;
                });

                _.each(unifiedX, function(x) {
                  plotlySeries.x.push(normalizeValue(x));
                  plotlySeries.y.push(normalizeValue(values[x] || null));
                });
              } else {
                _.each(data, function(row) {
                  plotlySeries.x.push(normalizeValue(row.x));
                  plotlySeries.y.push(normalizeValue(row.y));
                });
              }

              scope.data.push(plotlySeries);
            });

            var getTitle = function(axis) {
              if (angular.isDefined(axis) && angular.isDefined(axis.title)) {
                return axis.title.text;
              }
              return null;
            };

            scope.layout.xaxis = {title: getTitle(scope.options.xAxis),
                                  type: getScaleType(scope.options.xAxis.type)};
            if (angular.isDefined(scope.options.xAxis.labels)) {
              scope.layout.xaxis.showticklabels = scope.options.xAxis.labels.enabled;
            }
            if (angular.isArray(scope.options.yAxis)) {
              scope.layout.yaxis = {title: getTitle(scope.options.yAxis[0]),
                                    type: getScaleType(scope.options.yAxis[0].type)};
            }
            if (hasY2 && angular.isDefined(scope.options.yAxis)) {
              scope.layout.yaxis2 = {title: getTitle(scope.options.yAxis[1]),
                                     type: getScaleType(scope.options.yAxis[1].type),
                                     overlaying: 'y',
                                     side: 'right'};
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
          };

          scope.$watch('series', redraw);
          scope.$watch('options', redraw, true);
          scope.layout = {margin: {l: 50, r: 50, b: 50, t: 20, pad: 4}, hovermode: 'closest'};
          scope.plotlyOptions = {showLink: false, displaylogo: false};
          scope.data = [];
        }
      };
    });
})();
