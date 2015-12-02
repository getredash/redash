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
  var ColorPaletteArray = _.values(ColorPalette)

  var fillXValues = function(seriesList) {
    var xValues = _.uniq(_.flatten(_.pluck(seriesList, 'x')));
    xValues.sort();
    _.each(seriesList, function(series) {
      series.x.sort();
      _.each(xValues, function(value, index) {
        if (series.x[index] != value) {
          series.x.splice(index, 0, value);
          series.y.splice(index, 0, 0);
        }
      });
    });
  }

  var normalAreaStacking = function(seriesList) {
    fillXValues(seriesList);
    for (var i = 1; i < seriesList.length; i++) {
      for (var j = 0; j < seriesList[i].y.length; j++) {
        seriesList[i].y[j] += seriesList[i-1].y[j];
      }
    }
  }

  var percentAreaStacking = function(seriesList) {
    if (seriesList.length == 0)
      return;
    fillXValues(seriesList);
    for (var i = 0; i < seriesList[0].y.length; i++) {
      var sum = 0;
      for(var j = 0; j < seriesList.length; j++) {
        sum += seriesList[j]['y'][i];
      }
      for(var j = 0; j < seriesList.length; j++) {
        seriesList[j]['y'][i] = seriesList[j]['y'][i] / sum * 100;
        if (j > 0)
          seriesList[j].y[i] += seriesList[j-1].y[i];
      }
    }
  }

  var percentBarStacking = function(seriesList) {
    fillXValues(seriesList);
    for (var i = 0; i < seriesList[0].y.length; i++) {
      var sum = 0;
      for(var j = 0; j < seriesList.length; j++) {
        sum += seriesList[j]['y'][i];
      }
      for(var j = 0; j < seriesList.length; j++) {
        seriesList[j]['y'][i] = seriesList[j]['y'][i] / sum * 100;
      }
    }
  }

  angular.module('plotly-chart', [])
    .constant('ColorPalette', ColorPalette)
    .directive('plotlyChart', function () {
      return {
        restrict: 'E',
        template: '<plotly data="data" layout="layout" options="plotlyOptions"></plotly>',
        scope: {
          options: "=options",
          series: "=series",
          height: "=height",
        },
        link: function (scope, element, attrs) {
          var getScaleType = function(scale) {
            if (scale == 'datetime')
              return 'date';
            if (scale == 'logarithmic')
              return 'log';
            return scale;
          }

          var setType = function(series, type) {
            if (type == 'column') {
              series['type'] = 'bar';
            } else  if (type == 'line') {
              series['mode'] = 'lines';
            } else if (type == 'area') {
              series['fill'] = scope.options.series.stacking == null ? 'tozeroy' : 'tonexty';
              series['mode'] = 'lines';
            } else if (type == 'scatter') {
              series['type'] = 'scatter';
              series['mode'] = 'markers';
            }
          }

          var getColor = function(index) {
            return ColorPaletteArray[index % ColorPaletteArray.length];
          }

          var redraw = function() {
            scope.data.length = 0;
            delete scope.layout.barmode;
            delete scope.layout.xaxis;
            delete scope.layout.yaxis;
            delete scope.layout.yaxis2;

            if (scope.options.globalSeriesType == 'pie') {
              var hasX = _.contains(_.values(scope.options.columnMapping), 'x');
              var piesInRow = Math.ceil(Math.sqrt(scope.series.length));
              var cellSize = 1 / piesInRow;
              var padding = 0.05;
              _.each(scope.series, function(series, index) {
                var xPosition = index % piesInRow;
                var yPosition = Math.floor(index / piesInRow);
                var plotlySeries = {values: [], labels: [], type: 'pie', hole: .4,
                                    text: series.name, textposition: 'inside', name: series.name,
                                    domain: {x: [xPosition * cellSize, (xPosition + 1) * cellSize],
                                             y: [yPosition * cellSize, (yPosition + 1) * cellSize - padding]}};
                _.each(series.data, function(row, index) {
                  plotlySeries.values.push(row.y);
                  plotlySeries.labels.push(hasX ? row.x : 'Slice ' + index);
                });
                scope.data.push(plotlySeries);
              });
              return;
            }

            var hasY2 = false;
            _.each(scope.series, function(series, index) {
              var seriesOptions = scope.options.seriesOptions[series.name] || {};
              var plotlySeries = {x: [],
                                  y: [],
                                  name: seriesOptions.name || series.name,
                                  marker: {color: seriesOptions.color ? seriesOptions.color : getColor(index)}};
              if (seriesOptions.yAxis == 1) {
                hasY2 = true;
                plotlySeries.yaxis = 'y2';
              }
              setType(plotlySeries, seriesOptions.type);
              var data = series.data;
              if (scope.options.sortX) {
                data = _.sortBy(data, 'x');
              }
              _.each(data, function(row) {
                plotlySeries.x.push(row.x);
                plotlySeries.y.push(row.y);
              });
              scope.data.push(plotlySeries)
            });

            var getTitle = function(axis) {
              return axis.title ? axis.title.text : null;
            }

            scope.layout.xaxis = {title: getTitle(scope.options.xAxis),
                                  type: getScaleType(scope.options.xAxis.type),
                                  showticklabels: scope.options.xAxis.labels.enabled};
            scope.layout.yaxis = {title: getTitle(scope.options.yAxis[0]),
                                  type: getScaleType(scope.options.yAxis[0].type)};
            if (hasY2) {
              scope.layout.yaxis2 = {title: getTitle(scope.options.yAxis[1]),
                                     type: getScaleType(scope.options.yAxis[1].type),
                                     overlaying: 'y',
                                     side: 'right'};
            } else {
              delete scope.layout.yaxis2;
            }
            if (scope.options.series.stacking == 'normal') {
              scope.layout.barmode = 'stack';
              if (scope.options.globalSeriesType == 'area') {
                normalAreaStacking(scope.data);
              }
            } else if (scope.options.series.stacking == 'percent') {
              scope.layout.barmode = 'stack';
              if (scope.options.globalSeriesType == 'area') {
                percentAreaStacking(scope.data);
              } else if (scope.options.globalSeriesType == 'column') {
                percentBarStacking(scope.data);
              }
            }
          }

          scope.$watch('series', redraw, true);
          scope.$watch('options', redraw, true);
          scope.layout = {margin: {l: 50, r: 50, b: 50, t: 20, pad: 4}, height: scope.height};
          scope.plotlyOptions = {showLink: false, displaylogo: false};
          scope.data = [];
        }
      }
    });
})();
