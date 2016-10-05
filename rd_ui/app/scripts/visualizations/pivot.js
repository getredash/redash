(function() {
  var module = angular.module('redash.visualization');

  module.directive('pivotTableRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '=',
        visualization: '='
      },
      template: "",
      replace: false,
      link: function($scope, element) {
        $scope.$watch('queryResult && queryResult.getData()', function (data) {
          if (!data) {
            return;
          }

          if ($scope.queryResult.getData() === null) {
          } else {
            // We need to give the pivot table its own copy of the data, because it changes
            // it which interferes with other visualizations.
            data = $.extend(true, [], $scope.queryResult.getRawData());
            var options = {
              renderers: $.pivotUtilities.renderers,
              onRefresh: function(config) {
                var configCopy = $.extend(true, {}, config);
                //delete some values which are functions
                delete configCopy.aggregators;
                delete configCopy.renderers;
                delete configCopy.onRefresh;
                //delete some bulky default values
                delete configCopy.rendererOptions;
                delete configCopy.localeStrings;

                if ($scope.visualization) {
                  $scope.visualization.options = configCopy;
                }
              }
            };

            if ($scope.visualization) {
              $.extend(options, $scope.visualization.options);
            }
            $(element).pivotUI(data, options, true);
          }
        });
      }
    };
  });

  module.config(['VisualizationProvider', function (VisualizationProvider) {
    var editTemplate = '<div/>';
    var defaultOptions = {
    };

    VisualizationProvider.registerVisualization({
      type: 'PIVOT',
      name: 'Pivot Table',
      renderTemplate: '<pivot-table-renderer visualization="visualization" query-result="queryResult"></pivot-table-renderer>',
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }]);
})();
