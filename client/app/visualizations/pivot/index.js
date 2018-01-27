import angular from 'angular';
import $ from 'jquery';
import 'pivottable';
import 'pivottable/dist/pivot.css';

import editorTemplate from './pivottable-editor.html';
import './pivot.less';


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
      function removeControls() {
        const hideControls =
          $scope.visualization.options.controls &&
          $scope.visualization.options.controls.enabled;

        document.querySelectorAll('.pvtAxisContainer, .pvtRenderer, .pvtVals').forEach((control) => {
          if (hideControls) {
            control.style.display = 'none';
          } else {
            control.style.display = '';
          }
        });
      }

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
            removeControls();
          }
        });
      }

      $scope.$watch('queryResult && queryResult.getData()', updatePivot);
      $scope.$watch('visualization.options.controls.enabled', removeControls);
    },
  };
}

function pivotTableEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
  };
}

export default function init(ngModule) {
  ngModule.directive('pivotTableRenderer', pivotTableRenderer);
  ngModule.directive('pivotTableEditor', pivotTableEditor);

  ngModule.config((VisualizationProvider) => {
    const editTemplate = '<pivot-table-editor></pivot-table-editor>';
    const defaultOptions = {
      defaultRows: 10,
      defaultColumns: 3,
      minColumns: 2,
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
