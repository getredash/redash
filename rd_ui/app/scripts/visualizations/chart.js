(function () {
  var chartVisualization = angular.module('redash.visualization');

  chartVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    var renderTemplate = '<chart-renderer options="visualization.options" query-result="queryResult"></chart-renderer>';
    var editTemplate = '<chart-editor></chart-editor>';
    var defaultOptions = {
      'series': {
        'type': 'column',
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

        var reloadData = function(data) {
          if (!data || $scope.queryResult.getData() == null) {
            $scope.chartSeries.splice(0, $scope.chartSeries.length);
          } else {
            $scope.chartSeries.splice(0, $scope.chartSeries.length);

            console.log('mapping:', $scope.options.columnMapping);
            _.each($scope.queryResult.getChartData($scope.options.columnMapping), function (s) {
              $scope.chartSeries.push(_.extend(s, {'stacking': 'normal'}));
            });
          }
        };

        $scope.$watch('options', function (chartOptions) {
          if (chartOptions) {
            $scope.chartOptions = chartOptions;
          }
        });

        $scope.$watchCollection('options.columnMapping', function (chartOptions) {
          reloadData($scope.queryResult.getData());
        });

        $scope.$watch('queryResult && queryResult.getData()', function (data) {
          reloadData(data);
        });
      }]
    }
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

        scope.columns = scope.query.getQueryResult().getColumns();
        scope.columnTypes = {
          "X": "x",
          "Y": "y",
          "Series": "series",
          "Unused": "unused"
        };

        scope.logMapping = function () {
          console.log(scope.visualization.options.columnMapping);
        }

        var chartOptionsUnwatch = null;

        scope.$watch('visualization', function (visualization) {
          if (visualization && visualization.type == 'CHART') {
            if (scope.visualization.options.series.stacking === null) {
              scope.stacking = "none";
            } else if (scope.visualization.options.series.stacking === undefined) {
              scope.stacking = "normal";
            } else {
              scope.stacking = scope.visualization.options.series.stacking;
            }

            if (scope.visualization.options.columnMapping == undefined) {
              // initial mapping
              scope.visualization.options.columnMapping = {};
              _.each(scope.columns, function(column) {
                var definition = column.name.split("::");
                if (definition.length == 1) {
                  scope.visualization.options.columnMapping[column.name] = 'unused';
                } else if (definition == 'multi-filter') {
                  scope.visualization.options.columnMapping[column.name] = 'series';
                } else if (_.indexOf(_.values(scope.columnTypes), definition[1]) != -1) {
                  scope.visualization.options.columnMapping[column.name] = definition[1];
                } else {
                  scope.visualization.options.columnMapping[column.name] = 'unused';
                }
              });
              scope.logMapping();
            }

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