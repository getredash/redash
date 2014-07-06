(function () {
  var chartVisualization = angular.module('redash.visualization');

  chartVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    var renderTemplate = '<chart-renderer options="visualization.options" query-result="queryResult"></chart-renderer>';
    var editTemplate = '<chart-editor></chart-editor>';
    var defaultOptions = {
      'series': {
//        'type': 'column',
        'stacking': null
      }
    };

    VisualizationProvider.registerVisualization({
      type: 'CHART',
      name: 'Chart',
      renderTemplate: renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }]);

  chartVisualization.directive('chartRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '=',
        options: '=?'
      },
      template: "<chart options='chartOptions' series='chartSeries' class='graph'></chart>",
      replace: false,
      controller: ['$scope', function ($scope) {
        $scope.chartSeries = [];
        $scope.chartOptions = {};

        var reloadData = _.throttle(function(data) {
          if (!data || ($scope.queryResult && $scope.queryResult.getData()) == null) {
            $scope.chartSeries.splice(0, $scope.chartSeries.length);
          } else {
            $scope.chartSeries.splice(0, $scope.chartSeries.length);

            _.each($scope.queryResult.getChartData($scope.options.columnMapping), function (s) {
              var additional = {'stacking': 'normal'};
              if ($scope.options.seriesOptions && $scope.options.seriesOptions[s.name]) {
                additional = $scope.options.seriesOptions[s.name];
                if (!additional.name || additional.name == "") {
                  additional.name = s.name;
                }
              }
              $scope.chartSeries.push(_.extend(s, additional));
            });
          }
        }, 500);

        $scope.$watch('options', function (chartOptions) {
          if (chartOptions) {
            $scope.chartOptions = chartOptions;
          }
        });

        $scope.$watch('options.seriesOptions', function () {
          reloadData(true);
        }, true);


        $scope.$watchCollection('options.columnMapping', function (chartOptions) {
          reloadData(true);
        });

        $scope.$watch('queryResult && queryResult.getData()', function (data) {
          reloadData(data);
        });
      }]
    };
  });

  chartVisualization.directive('chartEditor', function () {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/chart_editor.html',
      link: function (scope, element, attrs) {
        scope.seriesTypes = {
          'Line': 'line',
          'Column': 'column',
          'Area': 'area',
          'Scatter': 'scatter',
          'Pie': 'pie'
        };

        scope.stackingOptions = {
          "None": "none",
          "Normal": "normal",
          "Percent": "percent"
        };

        scope.xAxisOptions = {
          "Date/Time": "datetime",
          "Linear": "linear",
          "Category": "category"
        };

        scope.xAxisType = "datetime";
        scope.stacking = "none";


        scope.columnTypes = {
          "X": "x",
//          "X (Date time)": "x",
//          "X (Linear)": "x-linear",
//          "X (Category)": "x-category",
          "Y": "y",
          "Series": "series",
          "Unused": "unused"
        };

        scope.series = [];

        scope.columnTypeSelection = {};

        var chartOptionsUnwatch = null,
            columnsWatch = null;

        scope.$watch('visualization.type', function (visualizationType) {
          if (visualizationType == 'CHART') {
            if (scope.visualization.options.series.stacking === null) {
              scope.stacking = "none";
            } else if (scope.visualization.options.series.stacking === undefined) {
              scope.stacking = "normal";
            } else {
              scope.stacking = scope.visualization.options.series.stacking;
            }

            columnsWatch = scope.$watch('queryResult.getId()', function(id) {
              if (!id) {
                return;
              }

              scope.columns = scope.queryResult.getColumns();

              if (scope.visualization.options.columnMapping == undefined) {
                scope.visualization.options.columnMapping = {};
              }

              scope.columnTypeSelection = scope.visualization.options.columnMapping;

              _.each(scope.columns, function(column) {
                var definition = column.name.split("::"),
                    definedColumns = _.keys(scope.visualization.options.columnMapping);

                if (_.indexOf(definedColumns, column.name) != -1) {
                  // Skip already defined columns.
                  return;
                };

                if (definition.length == 1) {
                  scope.columnTypeSelection[column.name] = scope.visualization.options.columnMapping[column.name] = 'unused';
                } else if (definition == 'multi-filter') {
                  scope.columnTypeSelection[column.name] = scope.visualization.options.columnMapping[column.name] = 'series';
                } else if (_.indexOf(_.values(scope.columnTypes), definition[1]) != -1) {
                  scope.columnTypeSelection[column.name] = scope.visualization.options.columnMapping[column.name] = definition[1];
                } else {
                  scope.columnTypeSelection[column.name] = scope.visualization.options.columnMapping[column.name] = 'unused';
                }
              });
            });

            scope.$watchCollection('columnTypeSelection', function(selections) {
              _.each(scope.columnTypeSelection, function(type, name) {
                scope.visualization.options.columnMapping[name] = type;
              });
            });

            scope.$watchCollection('visualization.options.columnMapping', function (chartOptions) {
              scope.series = _.map(scope.query.getQueryResult().getChartData(scope.visualization.options.columnMapping), function (s) { return s.name; });

              // TODO: remove uneeded ones?
              if (scope.visualization.options.seriesOptions == undefined) {
                scope.visualization.options.seriesOptions = {};
              };

              _.each(scope.series, function(s, i) {
                if (scope.visualization.options.seriesOptions[s] == undefined) {
                  scope.visualization.options.seriesOptions[s] = {'type': 'column', 'yAxis': 0};
                }
                scope.visualization.options.seriesOptions[s].zIndex = i;

              });
              scope.zIndexes = _.range(scope.series.length);
              scope.yAxes = [[0, 'left'], [1, 'right']];
            });

            chartOptionsUnwatch = scope.$watch("stacking", function (stacking) {
              if (stacking == "none") {
                scope.visualization.options.series.stacking = null;
              } else {
                scope.visualization.options.series.stacking = stacking;
              }
            });

            scope.xAxisType = (scope.visualization.options.xAxis && scope.visualization.options.xAxis.type) || scope.xAxisType;

            xAxisUnwatch = scope.$watch("xAxisType", function (xAxisType) {
              scope.visualization.options.xAxis = scope.visualization.options.xAxis || {};
              scope.visualization.options.xAxis.type = xAxisType;
            });
          } else {
            if (chartOptionsUnwatch) {
              chartOptionsUnwatch();
              chartOptionsUnwatch = null;
            }

            if (columnsWatch) {
              columnWatch();
              columnWatch = null;
            }

            if (xAxisUnwatch) {
              xAxisUnwatch();
              xAxisUnwatch = null;
            }
          }
        });
      }
    }
  });
}());