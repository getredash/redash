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

function getDefaultColumnsOptions(columns) {
  return _.map(columns, (col, index) => ({
    name: col.name,
    type: col.type,
    visible: true,
    order: 100000 + index,
    title: getColumnCleanName(col.name),
    allowHTML: false,
    alignContent: getColumnContentAlignment(col.type),
  }));
}

function getColumnsOptions(columns, visualizationColumns) {
  const options = getDefaultColumnsOptions(columns);
  visualizationColumns = _.object(_.map(
    visualizationColumns,
    (col, index) => [col.name, _.extend({}, col, { order: index })],
  ));

  _.each(options, col => _.extend(col, visualizationColumns[col.name]));

  return _.sortBy(options, 'order');
}

function getColumnsToDisplay(columns, options, $filter, clientConfig) {
  columns = _.object(_.map(columns, col => [col.name, col]));
  const result = _.map(options, col => _.extend({}, col, columns[col.name], {
    formatFunction: _.partial(formatValue, $filter, clientConfig, _, col.type),
  }));
  return _.sortBy(_.filter(result, 'visible'), 'order');
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
          const columnsOptions = getColumnsOptions(
            columns,
            _.extend({}, $scope.options).columns,
          );
          $scope.gridColumns = getColumnsToDisplay(columns, columnsOptions, $filter, clientConfig);
        }
      }

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (queryResult) {
          update();
        }
      });

      $scope.$watch('options', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          update();
        }
      }, true);
    },
  };
}

function GridEditor() {
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
          $scope.visualization.options.columns = [];
        } else {
          const columns = $scope.queryResult.getColumns();
          $scope.visualization.options.columns = getColumnsOptions(
            columns,
            $scope.visualization.options.columns,
          );
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
