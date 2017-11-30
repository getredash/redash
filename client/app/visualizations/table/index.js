import moment from 'moment';
import _ from 'underscore';
import { getColumnCleanName } from '@/services/query-result';
import template from './table.html';
import editorTemplate from './table-editor.html';
import './table-editor.less';

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
      if (_.isString(value)) {
        formattedValue = $filter('linkify')(value);
      }
      break;
  }

  return formattedValue;
}

function getColumnContentAlignment(type) {
  return ['integer', 'float', 'boolean', 'date', 'datetime'].indexOf(type) >= 0 ? 'right' : 'left';
}

function getColumnsOptions(columns, $filter, clientConfig) {
  return _.map(columns, (col, index) => ({
    name: col.name,
    type: col.type,
    visible: true,
    order: 100000 + index,
    title: getColumnCleanName(col.name),
    formatFunction: _.partial(formatValue, $filter, clientConfig, _, col.type),
    allowHTML: true,
    alignContent: getColumnContentAlignment(col.type),
  }));
}

function columnOptionsAsMap(options) {
  return _.object(_.map(options, column => [column.name, column]));
}

function GridRenderer(clientConfig) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=',
    },
    template,
    replace: false,
    controller($scope, $filter) {
      $scope.gridColumns = [];
      $scope.gridRows = [];

      function update() {
        if ($scope.queryResult.getData() == null) {
          $scope.gridColumns = [];
          $scope.filters = [];
        } else {
          $scope.filters = $scope.queryResult.getFilters();
          $scope.gridRows = $scope.queryResult.getData();

          const columns = $scope.queryResult.getColumns();
          const columnsOptions = columnOptionsAsMap(getColumnsOptions(columns, $filter, clientConfig));
          const visualizationOptions = columnOptionsAsMap(_.map(
            _.extend({}, $scope.options).columns,
            (col, index) => {
              col.order = index;
              return col;
            },
          ));
          $scope.gridColumns = _.map(columns, col => _.extend(
            {},
            columnsOptions[col.name],
            visualizationOptions[col.name],
            col,
          ));
          $scope.gridColumns = _.sortBy(
            _.filter($scope.gridColumns, 'visible'),
            'order',
          );
        }
      }

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (!queryResult) {
          return;
        }
        update();
      });

      $scope.$watch('options', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          update();
        }
      }, true);
    },
  };
}

function GridEditor($filter, clientConfig) {
  return {
    restrict: 'E',
    template: editorTemplate,
    link: ($scope) => {
      $scope.allowedItemsPerPage = [5, 10, 15, 20, 25];
      $scope.allowedContentAlignment = ['left', 'center', 'right'];

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (!queryResult) {
          return;
        }
        if ($scope.queryResult.getData() == null) {
          $scope.visualization.options.columns = {};
        } else {
          const columns = $scope.queryResult.getColumns();
          const columnsOptions = getColumnsOptions(columns, $filter, clientConfig);
          _.each(columnsOptions, (column) => {
            column.allowHTML = false;
          });
          $scope.visualization.options.columns = columnsOptions;
        }
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('gridRenderer', GridRenderer);
  ngModule.directive('gridEditor', GridEditor);

  ngModule.config((VisualizationProvider) => {
    const defaultOptions = {
      itemsPerPage: 15,
      defaultRows: 14,
      defaultColumns: 4,
      minColumns: 2,
    };

    VisualizationProvider.registerVisualization({
      type: 'TABLE',
      name: 'Table',
      renderTemplate: '<grid-renderer options="visualization.options" query-result="queryResult"></grid-renderer>',
      editorTemplate: '<grid-editor></grid-editor>',
      defaultOptions,
    });
  });
}
