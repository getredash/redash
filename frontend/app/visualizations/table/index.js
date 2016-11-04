import moment from 'moment';
import { each, isString, object, pluck } from 'underscore';
import { getColumnCleanName } from '../../services/query-result';
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
          const columnsMap = object(pluck(columns, 'name'), pluck(columns, 'type'));

          const prepareGridData = (data) => {
            const gridData = data.map((row) => {
              const newRow = {};
              each(row, (val, key) => {
                const formattedValue = formatValue($filter, clientConfig, val, columnsMap[key]);
                newRow[getColumnCleanName(key)] = formattedValue;
              });
              return newRow;
            });

            return gridData;
          };

          $scope.gridRows = prepareGridData($scope.queryResult.getData());
          $scope.gridColumns = $scope.queryResult.getColumnCleanNames();
        }
      });
    },
  };
}

export default function (ngModule) {
  ngModule.config((VisualizationProvider) => {
    VisualizationProvider.registerVisualization({
      type: 'TABLE',
      name: 'Table',
      renderTemplate: '<grid-renderer options="visualization.options" query-result="queryResult"></grid-renderer>',
      skipTypes: true,
    });
  });
  ngModule.directive('gridRenderer', GridRenderer);
}
