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
        $scope.$watch('queryResult && queryResult.getData() && visualization.options',
          function() {
            var queryData = $scope.queryResult.getData();
            if (queryData) {
             var colNumber = $scope.visualization.options.colNumber || 0;
             $scope.counterValue =
              (queryData[colNumber] && queryData[colNumber].count) || '--';

             if ($scope.visualization.options.target) {
               $scope.delta = $scope.counterValue - $scope.visualization.options.target;
               $scope.trendPositive = $scope.delta > 0;
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
