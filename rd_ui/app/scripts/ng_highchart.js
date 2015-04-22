(function () {
  'use strict';

  var ColorPalette = {
    'Blue':'#4572A7',
    'Red':'#AA4643',
    'Green': '#89A54E',
    'Purple': '#80699B',
    'Cyan': '#3D96AE',
    'Orange': '#DB843D',
    'Light Blue': '#92A8CD',
    'Lilac': '#A47D7C',
    'Light Green': '#B5CA92',
  };

  Highcharts.setOptions({
    colors: _.values(ColorPalette)
  });

  var defaultOptions = {
    title: {
      "text": null
    },
    xAxis: {
      type: 'datetime'
    },
    yAxis: [
      {
        title: {
          text: null
        },
        // showEmpty: true // by default
      },
      {
        title: {
          text: null
        },
        opposite: true,
        showEmpty: false
      }
    ],


    tooltip: {
      valueDecimals: 2,
      formatter: function () {
        if (!this.points) {
          this.points = [this.point];
        }
        ;

        if (moment.isMoment(this.x)) {
          var s = '<b>' + this.x.toDate().toLocaleString() + '</b>',
              pointsCount = this.points.length;

          $.each(this.points, function (i, point) {
            s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + '</span>: ' +
                Highcharts.numberFormat(point.y);

            if (pointsCount > 1 && point.percentage) {
              s += " (" + Highcharts.numberFormat(point.percentage) + "%)";
            }
          });
        } else {
          var points = this.points;
          var name = points[0].key || points[0].name;

          var s = "<b>" + name + "</b>";

          $.each(points, function (i, point) {
            if (points.length > 1) {
              s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + '</span>: ' + Highcharts.numberFormat(point.y);
            } else {
              s += ": " + Highcharts.numberFormat(point.y);
              if (point.percentage < 100) {
                s += ' (' + Highcharts.numberFormat(point.percentage) + '%)';
              }
            }
          });
        }

        return s;
      },
      shared: true
    },
    exporting: {
      chartOptions: {
        title: {
          text: ''
        }
      },
      buttons: {
        contextButton: {
          menuItems: [
            {
              text: 'Toggle % Stacking',
              onclick: function () {
                var newStacking = "normal";
                if (this.series[0].options.stacking == "normal") {
                  newStacking = "percent";
                }

                _.each(this.series, function (series) {
                  series.update({stacking: newStacking}, true);
                });
              }
            },
            {
              text: 'Select All',
              onclick: function () {
                _.each(this.series, function (s) {
                  s.setVisible(true, false);
                });
                this.redraw();
              }
            },
            {
              text: 'Unselect All',
              onclick: function () {
                _.each(this.series, function (s) {
                  s.setVisible(false, false);
                });
                this.redraw();
              }
            },
            {
              text: 'Show Total',
              onclick: function () {
                var hasTotalsAlready = _.some(this.series, function (s) {
                    var res = (s.name == 'Total');
                    //if 'Total' already exists - just make it visible
                    if (res) s.setVisible(true, false);
                    return res;
                })
                var data = {};
                _.each(this.series, function (s) {
                  if (s.name != 'Total') s.setVisible(false, false);
                  if (!hasTotalsAlready) {
                      _.each(s.data, function (p) {
                        data[p.x] = data[p.x] || {'x': p.x, 'y': 0};
                        data[p.x].y = data[p.x].y + p.y;
                      }); 
                  }
                });

                if (!hasTotalsAlready) {
                    this.addSeries({
                      data: _.values(data),
                      type: 'line',
                      name: 'Total'
                    }, false)
                }

                this.redraw();
              }
            },
            {
              text: 'Save Image',
              onclick: function () {
                var canvas = document.createElement('canvas'); 
                window.canvg(canvas, this.getSVG());
                var href = canvas.toDataURL('image/png');
                var a = document.createElement('a');
                a.href = href;
                var filenameSuffix = new Date().toISOString().replace(/:/g,'_').replace('Z', '');
                if (this.title) {
                    filenameSuffix = this.title.text;
                }
                a.download = 'redash_charts_'+filenameSuffix+'.png';
                document.body.appendChild(a);
                a.click();
                a.remove(); 
              }
            }
          ]
        }
      }
    },
    credits: {
      enabled: false
    },
    plotOptions: {
      area: {
        marker: {
          enabled: false,
          symbol: 'circle',
          radius: 2,
          states: {
            hover: {
              enabled: true
            }
          }
        }
      },
      column: {
        stacking: "normal",
        pointPadding: 0,
        borderWidth: 1,
        groupPadding: 0,
        shadow: false
      },
      line: {
        marker: {
          radius: 1
        },
        lineWidth: 2,
        states: {
          hover: {
            lineWidth: 2,
            marker: {
              radius: 3
            }
          }
        }
      },
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          color: '#000000',
          connectorColor: '#000000',
          format: '<b>{point.name}</b>: {point.y} ({point.percentage:.1f} %)'
        }
      },
      scatter: {
        marker: {
          radius: 5,
          states: {
            hover: {
              enabled: true,
              lineColor: 'rgb(100,100,100)'
            }
          }
        },
        tooltip: {
          headerFormat: '<b>{series.name}</b><br>',
          pointFormat: '{point.x}, {point.y}'
        }
      }
    },
    series: []
  };

  angular.module('highchart', [])
      .constant('ColorPalette', ColorPalette)
      .directive('chart', ['$timeout', function ($timeout) {
        return {
          restrict: 'E',
          template: '<div></div>',
          scope: {
            options: "=options",
            series: "=series"
          },
          transclude: true,
          replace: true,

          link: function (scope, element, attrs) {
            var chartsDefaults = {
              chart: {
                renderTo: element[0],
                type: attrs.type || null,
                height: attrs.height || null,
                width: attrs.width || null
              }
            };

            var chartOptions = $.extend(true, {}, defaultOptions, chartsDefaults);

            // $timeout makes sure that this function invoked after the DOM ready. When draw/init
            // invoked after the DOM is ready, we see first an empty HighCharts objects and later
            // they get filled up. Which gives the feeling that the charts loading faster (otherwise
            // we stare at an empty screen until the HighCharts object is ready).
            $timeout(function () {
              // Update when options change
              scope.$watch('options', function (newOptions) {
                initChart(newOptions);
              }, true);

              //Update when charts data changes
              scope.$watchCollection('series', function (series) {
                if (!series || series.length == 0) {
                  scope.chart.showLoading();
                } else {
                  drawChart();
                }
                ;
              });
            });

            function initChart(options) {
              if (scope.chart) {
                scope.chart.destroy();
              }
              ;

              $.extend(true, chartOptions, options);

              scope.chart = new Highcharts.Chart(chartOptions);
              drawChart();
            }

            function drawChart() {
              while (scope.chart.series.length > 0) {
                scope.chart.series[0].remove(false);
              };

              // We check either for true or undefined for backward compatibility.
              var series = scope.series;

              if (chartOptions['sortX'] === true || chartOptions['sortX'] === undefined) {
                var seriesCopy = [];

                _.each(series, function (s) {
                  // make a copy of series data, so we don't override original.
                  var fieldName = 'x';
                  if (s.data.length > 0 && _.has(s.data[0], 'name')) {
                    fieldName = 'name';
                  };

                  var sorted = _.extend({}, s, {data: _.sortBy(s.data, fieldName)});
                  seriesCopy.push(sorted);
                });

                series = seriesCopy;
              }

              if (chartOptions['sortY'] === true || chartOptions['sortY'] === undefined) {
                var sortable = true;

                for (var i = 0; i < series.length; i++) {
                  if (series[i].data.length != 1) {
                    sortable = false;
                    break;
                  }
                }

                if (sortable) {
                  var sortFunction = function(s1, s2) {
                    if (s1.data.length == 1 && s2.data.length == 1) {
                      var a = s1.data[0].y;
                      var b = s2.data[0].y;

                      if (a < b) {
                        return -1;
                      } else if (a == b) {
                        return 0;
                      } else {
                        return 1;
                      }
                    }
                  }

                  series.sort(sortFunction);
                }
              }

              if (!('xAxis' in chartOptions && 'type' in chartOptions['xAxis'])) {
                if (series.length > 0 && _.some(series[0].data, function (p) {
                  return (angular.isString(p.x) || angular.isDefined(p.name));
                })) {
                  chartOptions['xAxis'] = chartOptions['xAxis'] || {};
                  chartOptions['xAxis']['type'] = 'category';
                } else {
                  chartOptions['xAxis'] = chartOptions['xAxis'] || {};
                  chartOptions['xAxis']['type'] = 'datetime';
                }
              }

              if (chartOptions['xAxis']['type'] == 'category' || chartOptions['series']['type']=='pie') {
                if (!angular.isDefined(series[0].data[0].name)) {
                  // We need to make sure that for each category, each series has a value.
                  var categories = _.union.apply(this, _.map(series, function (s) {
                    return _.pluck(s.data, 'x')
                  }));

                  _.each(series, function (s) {
                    // TODO: move this logic to Query#getChartData
                    var yValues = _.groupBy(s.data, 'x');

                    var newData = _.map(categories, function (category) {
                      return {
                        name: category,
                        y: (yValues[category] && yValues[category][0].y) || 0
                      }
                    });

                    s.data = newData;
                  });
                }
              }

              scope.chart.counters.color = 0;

              _.each(series, function (s) {
                // here we override the series with the visualization config
                s = _.extend(s, chartOptions['series']);

                if (s.type == 'area') {
                  _.each(s.data, function (p) {
                    // This is an insane hack: somewhere deep in HighChart's code,
                    // when you stack areas, it tries to convert the string representation
                    // of point's x into a number. With the default implementation of toString
                    // it fails....

                    if (moment.isMoment(p.x)) {
                      p.x.toString = function () {
                        return String(this.toDate().getTime());
                      };
                    }
                  });
                }
                ;

                scope.chart.addSeries(s, false);
              });

              scope.chart.redraw();
              scope.chart.hideLoading();
            }

          }
        };

      }]);
})();
