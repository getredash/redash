(function () {
  'use strict';

  // The following colors will be used if you pick "Automatic" color.
  var BaseColors = {
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
  }

  // Additional colors for the user to choose from:
  var ColorPalette = _.extend({}, BaseColors, {
    'Indian Red': '#F8766D',
    'Green 2': '#53B400',
    'Green 3': '#00C094',
    'DarkTurquoise': '#00B6EB',
    'Dark Violet': '#A58AFF',
    'Pink 2' : '#FB61D7'
  });

  var ColorPaletteArray = _.values(BaseColors);

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

  var storeOriginalHeightForEachSeries = function(seriesList) {
    _.each(seriesList, function(series) {
      if(!_.has(series,'visible')){
        series.visible = true;
        series.original_y = series.y.slice();
      }
    });
  };

  var getEnabledSeries = function(seriesList){
    return _.filter(seriesList, function(series) {
		  return series.visible === true;
	  });
  };

  var initializeTextAndHover = function(seriesList){
    _.each(seriesList, function(series) {
      series.text = [];
      series.hoverinfo = 'text+name';
    });
  };

  var normalAreaStacking = function(seriesList) {
    fillXValues(seriesList);
    storeOriginalHeightForEachSeries(seriesList);
    initializeTextAndHover(seriesList);
    seriesList = getEnabledSeries(seriesList);

    _.each(seriesList, function(series, seriesIndex, list){
      _.each(series.y, function(undefined, yIndex, undefined2){
        var cumulativeHeightOfPreviousSeries = seriesIndex > 0 ? list[seriesIndex-1].y[yIndex] : 0;
        var cumulativeHeightWithThisSeries = cumulativeHeightOfPreviousSeries + series.original_y[yIndex];
        series.y[yIndex] = cumulativeHeightWithThisSeries;
        series.text.push('Value: ' + series.original_y[yIndex] + '<br>Sum: ' + cumulativeHeightWithThisSeries);
      });
    });
  };

  var lastVisibleY = function(seriesList, lastSeriesIndex, yIndex){
    for(; lastSeriesIndex >= 0; lastSeriesIndex--){
      if(seriesList[lastSeriesIndex].visible === true){
        return seriesList[lastSeriesIndex].y[yIndex];
      }
    }
    return 0;
  }

  var percentAreaStacking = function(seriesList) {
    if (seriesList.length === 0) {
      return;
    }
    fillXValues(seriesList);
    storeOriginalHeightForEachSeries(seriesList);
    initializeTextAndHover(seriesList);

    _.each(seriesList[0].y, function(seriesY, yIndex, undefined){

      var sumOfCorrespondingDataPoints = _.reduce(seriesList, function(total, series){
        return total + series.original_y[yIndex];
      }, 0);

      _.each(seriesList, function(series, seriesIndex, list){
        var percentage = (series.original_y[yIndex] / sumOfCorrespondingDataPoints ) * 100;
        var previousVisiblePercentage = lastVisibleY(seriesList, seriesIndex-1, yIndex);
        series.y[yIndex] = percentage + previousVisiblePercentage;
        series.text.push('Value: ' + series.original_y[yIndex] + '<br>Relative: ' + percentage.toFixed(2) + '%');
      });
    });
  };

  var percentBarStacking = function(seriesList) {
    if (seriesList.length === 0) {
      return;
    }
    fillXValues(seriesList);
    initializeTextAndHover(seriesList);
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

  function seriesMinValue(series) {
    return _.min(_.map(series, function(s) { return _.min(series.y) }));
  }

  function seriesMaxValue(series) {
    return _.max(_.map(series, function(s) { return _.max(series.y) }));
  }

  function leftAxisSeries(series) {
    return _.filter(series, function(s) { return s.yaxis !== 'y2' });
  }

  function rightAxisSeries(series) {
    return _.filter(series, function(s) { return s.yaxis === 'y2' });
  }

  angular.module('plotly', [])
    .constant('ColorPalette', ColorPalette)
    .directive('plotlyChart', function () {
      var bottomMargin = 50;
      return {
        restrict: 'E',
        template: '<div></div>',
        scope: {
          options: "=",
          series: "=",
          height: "="
        },
        link: function (scope, element) {
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

          var calculateHeight = function() {
            var height = Math.max(scope.height, (scope.height - 50) + bottomMargin);
            return height;
          }

          var recalculateOptions = function() {
            scope.data.length = 0;
            scope.layout.showlegend = _.has(scope.options, 'legend') ? scope.options.legend.enabled : true;
            if(_.has(scope.options, 'bottomMargin')) {
              bottomMargin = parseInt(scope.options.bottomMargin);
              scope.layout.margin.b = bottomMargin;
            }
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
              });
              return;
            }

            var hasY2 = false;
            var sortX = scope.options.sortX === true || scope.options.sortX === undefined;
            var useUnifiedXaxis = sortX && scope.options.xAxis.type === 'category';

            var unifiedX = null;
            if (useUnifiedXaxis) {
              unifiedX = _.sortBy(_.union.apply(_, _.map(scope.series, function(s) { return _.pluck(s.data, 'x'); })), _.identity);
            }

            _.each(scope.series, function(series, index) {
              var seriesOptions = scope.options.seriesOptions[series.name] || {type: scope.options.globalSeriesType};
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

              if (angular.isNumber(scope.options.yAxis[0].rangeMin) || angular.isNumber(scope.options.yAxis[0].rangeMax)) {
                var min = scope.options.yAxis[0].rangeMin || Math.min(0, seriesMinValue(leftAxisSeries(scope.data)));
                var max = scope.options.yAxis[0].rangeMax || seriesMaxValue(leftAxisSeries(scope.data));

                scope.layout.yaxis.range = [min, max];
              }
            }
            if (hasY2 && angular.isDefined(scope.options.yAxis)) {
              scope.layout.yaxis2 = {title: getTitle(scope.options.yAxis[1]),
                                     type: getScaleType(scope.options.yAxis[1].type),
                                     overlaying: 'y',
                                     side: 'right'};

              if (angular.isNumber(scope.options.yAxis[1].rangeMin) || angular.isNumber(scope.options.yAxis[1].rangeMax)) {
                var min = scope.options.yAxis[1].rangeMin || Math.min(0, seriesMinValue(rightAxisSeries(scope.data)));
                var max = scope.options.yAxis[1].rangeMax || seriesMaxValue(rightAxisSeries(scope.data));

                scope.layout.yaxis2.range = [min, max];
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
          };

          scope.$watch('series', recalculateOptions);
          scope.$watch('options', recalculateOptions, true);

          scope.layout = {margin: {l: 50, r: 50, b: bottomMargin, t: 20, pad: 4}, height: calculateHeight(), autosize: true, hovermode: 'closest'};
          scope.plotlyOptions = {showLink: false, displaylogo: false};
          scope.data = [];

          var element = element[0].children[0];
          Plotly.newPlot(element, scope.data, scope.layout, scope.plotlyOptions);

          element.on('plotly_afterplot', function(d) {
            if(scope.options.globalSeriesType === 'area' && (scope.options.series.stacking === 'normal' || scope.options.series.stacking === 'percent')){
              $(element).find(".legendtoggle").each(function(i, rectDiv) {
                  d3.select(rectDiv).on('click', function () {
                    var maxIndex = scope.data.length - 1;
                    var itemClicked = scope.data[maxIndex - i];

                    itemClicked.visible = (itemClicked.visible === true) ? 'legendonly' : true;
                    if (scope.options.series.stacking === 'normal') {
                      normalAreaStacking(scope.data);
                    } else if (scope.options.series.stacking === 'percent') {
                      percentAreaStacking(scope.data);
                    }
                    Plotly.redraw(element);
                  });
              });
            }
          });
          scope.$watch('layout', function (layout, old) {
            if (angular.equals(layout, old)) {
              return;
            }
            Plotly.relayout(element, layout);
          }, true);

          scope.$watch('data', function (data, old) {
            if (!_.isEmpty(data)) {
              Plotly.redraw(element);
            }
          }, true);
        }
      };
    });
})();
