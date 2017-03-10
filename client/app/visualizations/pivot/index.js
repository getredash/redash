import $ from 'jquery';
import 'pivottable';
import 'pivottable/dist/pivot.css';
import { formatValue } from '../table';
import { getColumnCleanName } from '../../services/query-result';

function pivotTableRenderer(clientConfig, $filter) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      visualization: '=',
    },
    template: '',
    replace: false,
    link($scope, element) {
      $scope.$watch('queryResult && queryResult.getData()', (data) => {
        if (!data) {
          return;
        }

        if ($scope.queryResult.getData() !== null) {
          // We need to give the pivot table its own copy of the data, because it changes
          // it which interferes with other visualizations.
          data = [];
          const columns = $scope.queryResult.getColumns();
          const rows = $scope.queryResult.getData();
          rows.forEach((row) => {
            const rowObj = {};
            columns.forEach((col) => {
              const colName = getColumnCleanName(col.name);
              const value = formatValue($filter, clientConfig, row[col.name], col.type);
              rowObj[colName] = value;
            });
            data.push(rowObj);
          });

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
        }
      });
    },
  };
}

export default function (ngModule) {
  ngModule.directive('pivotTableRenderer', pivotTableRenderer);

  ngModule.config((VisualizationProvider) => {
    const editTemplate = '<div/>';
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
