'use strict';

(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
      var renderTemplate =
        '<counter-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</counter-renderer>';

      var editTemplate = '<counter-editor></counter-editor>';
      var defaultOptions = {
        counterColName: 'counter',
        rowNumber: 1,
        targetRowNumber: 1
      };

      VisualizationProvider.registerVisualization({
        type: 'COUNTER',
        name: 'Counter',
        renderTemplate: renderTemplate,
        editorTemplate: editTemplate,
        defaultOptions: defaultOptions
      });
    }
  ]);

  module.directive('counterRenderer', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/counter.html',
      link: function($scope, elm, attrs) {
        var refreshData = function() {
          var queryData = $scope.queryResult.getData();
          if (queryData) {
            var rowNumber = $scope.visualization.options.rowNumber - 1;
            var targetRowNumber = $scope.visualization.options.targetRowNumber - 1;
            var counterColName = $scope.visualization.options.counterColName;
            var targetColName = $scope.visualization.options.targetColName;

            if (counterColName) {
              $scope.counterValue = queryData[rowNumber][counterColName];
            }

            if (targetColName) {
              $scope.targetValue = queryData[targetRowNumber][targetColName];

              if ($scope.targetValue) {
                $scope.delta = $scope.counterValue - $scope.targetValue;
                $scope.trendPositive = $scope.delta >= 0;
              }
            } else {
              $scope.targetValue = null;
            }
          }
        };

        $scope.$watch("visualization.options", refreshData, true);
        $scope.$watch("queryResult && queryResult.getData()", refreshData);
      }
    }
  });

  module.directive('counterEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/counter_editor.html'
    }
  });

})();
