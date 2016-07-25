'use strict';

(function () {
  var module = angular.module('redash.visualization');

  module.directive('sunburstSequenceRenderer', function () {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/sunburst_sequence.html',
      link: function ($scope, elm, attrs) {
        var refreshData = function () {
          var queryData = $scope.queryResult.getData();
          if (queryData) {
            // do the render logic.
          }
        };

        $scope.$watch("visualization.options", refreshData, true);
        $scope.$watch("queryResult && queryResult.getData()", refreshData);
      }
    }
  });

  module.directive('sunburstSequenceEditor', function () {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/sunburst_sequence_editor.html'
    }
  });

  module.config(['VisualizationProvider', function (VisualizationProvider) {
    var renderTemplate =
      '<sunburst-sequence-renderer options="visualization.options" query-result="queryResult"></sunburst-sequence-renderer>';

    var editTemplate = '<sunburst-sequence-editor></sunburst-sequence-editor>';
    var defaultOptions = {
      //
    };

    VisualizationProvider.registerVisualization({
      type: 'SUNBURST_SEQUENCE',
      name: 'Sunburst Sequence',
      renderTemplate: renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }
  ]);
})();
