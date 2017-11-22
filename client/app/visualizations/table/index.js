import moment from 'moment';
import { _, partial, isString } from 'underscore';
import { getColumnCleanName } from '@/services/query-result';
import template from './table.html';

function formatValue($filter, clientConfig, value, type) {
  let formattedValue = value;
  switch (type) {
    case 'integer':
      formattedValue = $filter('number')(value, 0);
      break;
    case 'float':
      formattedValue = $filter('number')(value, 2);
      break;
    case 'boolean':
      if (value !== undefined) {
        formattedValue = String(value);
      }
      break;
    case 'date':
      if (value && moment.isMoment(value)) {
        formattedValue = value.format(clientConfig.dateFormat);
      }
      break;
    case 'datetime':
      if (value && moment.isMoment(value)) {
        formattedValue = value.format(clientConfig.dateTimeFormat);
      }
      break;
    default:
      if (isString(value)) {
        formattedValue = $filter('linkify')(value);
      }
      break;
  }

  return formattedValue;
}

function GridRenderer(clientConfig) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      itemsPerPage: '=',
    },
    template,
    replace: false,
    controller($scope, $filter) {
      $scope.gridColumns = [];
      $scope.gridRows = [];

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (!queryResult) {
          return;
        }

        if ($scope.queryResult.getData() == null) {
          $scope.gridColumns = [];
          $scope.filters = [];
        } else {
          $scope.filters = $scope.queryResult.getFilters();

          const columns = $scope.queryResult.getColumns();
          columns.forEach((col) => {
            col.title = getColumnCleanName(col.name);
            col.formatFunction = partial(formatValue, $filter, clientConfig, _, col.type);
          });

          $scope.gridRows = $scope.queryResult.getData();
          $scope.gridColumns = columns;
        }
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.config((VisualizationProvider) => {
    const defaultOptions = {
      defaultRows: 14,
      defaultColumns: 4,
      minColumns: 2,
    };

    VisualizationProvider.registerVisualization({
      type: 'TABLE',
      name: 'Table',
      renderTemplate: '<grid-renderer options="visualization.options" query-result="queryResult"></grid-renderer>',
      skipTypes: true,
      defaultOptions,
    });
  });
  ngModule.directive('gridRenderer', GridRenderer);
}
