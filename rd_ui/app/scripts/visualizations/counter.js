'use strict';

(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
      var renderTemplate =
        '<counter-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</counter-renderer>';

      var editTemplate = '<counter-editor></counter-editor>';
      var defaultOptions = {};

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
        $scope.visualization.options.rowNumber =
          $scope.visualization.options.rowNumber || 0;

        $scope.$watch('queryResult && queryResult.getData() && visualization.options',
          function() {
            var queryData = $scope.queryResult.getData();
            if (queryData) {
              var rowNumber = $scope.visualization.options.rowNumber || 0;
              var counterColName = $scope.visualization.options.counterColName || 'counter';
              var targetColName = $scope.visualization.options.targetColName || 'target';

              $scope.counterValue = queryData[rowNumber][counterColName];
              $scope.targetValue = queryData[rowNumber][targetColName];

              if ($scope.targetValue) {
                $scope.delta = $scope.counterValue - $scope.targetValue;
                $scope.trendPositive = $scope.delta >= 0;
              }
            }
          }, true);
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
