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

        $scope.$watch('options', function (chartOptions) {
          if (chartOptions) {
            $scope.chartOptions = chartOptions;
          }
        });
        $scope.$watch('queryResult && queryResult.getData()', function (data) {
          if (!data || $scope.queryResult.getData() == null) {
            $scope.chartSeries.splice(0, $scope.chartSeries.length);
          } else {
            $scope.chartSeries.splice(0, $scope.chartSeries.length);

            _.each($scope.queryResult.getChartData(), function (s) {
              $scope.chartSeries.push(_.extend(s, {'stacking': 'normal'}));
            });
          }
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

            chartOptionsUnwatch = scope.$watch("stacking", function (stacking) {
              if (stacking == "none") {
                scope.visualization.options.series.stacking = null;
              } else {
                scope.visualization.options.series.stacking = stacking;
              }
            });

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