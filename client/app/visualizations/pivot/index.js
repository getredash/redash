import angular from 'angular';
import $ from 'jquery';
import 'pivottable';
import 'pivottable/dist/pivot.css';

import editorTemplate from './pivottable-editor.html';


function pivotTableRenderer() {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      visualization: '=',
    },
    template: '',
    replace: false,
    link($scope, element) {
      function updatePivot() {
        $scope.$watch('queryResult && queryResult.getData()', (data) => {
          if (!data) {
            return;
          }

          if ($scope.queryResult.getData() !== null) {
            // We need to give the pivot table its own copy of the data, because it changes
            // it which interferes with other visualizations.
            data = angular.copy($scope.queryResult.getData());
            const options = {
              renderers: $.pivotUtilities.renderers,
              onRefresh(config) {
                const configCopy = Object.assign({}, config);
                // delete some values which are functions
                delete configCopy.aggregators;
                delete configCopy.renderers;
                delete configCopy.onRefresh;
                // delete some bulky default values
                delete configCopy.rendererOptions;
                delete configCopy.localeStrings;

                if ($scope.visualization) {
                  $scope.visualization.options = configCopy;
                }
              },
            };

            if ($scope.visualization) {
              Object.assign(options, $scope.visualization.options);
            }
            $(element).pivotUI(data, options, true);
            if (options.controls && options.controls.enabled) {
              const controls = $('.pvtAxisContainer, .pvtRenderer, .pvtVals');
              for (let i = 0; i < controls.length; i += 1) { controls[i].style.display = 'none'; }
            }
          }
        });
      }

      $scope.$watch('queryResult && queryResult.getData()', updatePivot);
      $scope.$watch('visualization.options.controls.enabled', updatePivot);
    },
  };
}

function pivotTableEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
  };
}

export default function (ngModule) {
  ngModule.directive('pivotTableRenderer', pivotTableRenderer);
  ngModule.directive('pivotTableEditor', pivotTableEditor);

  ngModule.config((VisualizationProvider) => {
    const editTemplate = '<pivot-table-editor></pivot-table-editor>';
    const defaultOptions = {
    };

    VisualizationProvider.registerVisualization({
      type: 'PIVOT',
      name: 'Pivot Table',
      renderTemplate: '<pivot-table-renderer visualization="visualization" query-result="queryResult"></pivot-table-renderer>',
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
