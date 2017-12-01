import _ from 'underscore';
import { getColumnCleanName } from '@/services/query-result';
import createFormatter from './formats';
import template from './table.html';
import editorTemplate from './table-editor.html';
import './table-editor.less';

function getColumnContentAlignment(type) {
  return ['integer', 'float', 'boolean', 'date', 'datetime'].indexOf(type) >= 0 ? 'right' : 'left';
}

function getDefaultColumnsOptions(columns) {
  const displayAs = {
    integer: 'number',
    float: 'number',
    boolean: 'boolean',
    date: 'datetime',
    datetime: 'datetime',
  };

  return _.map(columns, (col, index) => ({
    name: col.name,
    type: col.type,
    displayAs: displayAs[col.type] || 'string',
    visible: true,
    order: 100000 + index,
    title: getColumnCleanName(col.name),
    allowHTML: false,
    highlightLinks: false,
    alignContent: getColumnContentAlignment(col.type),
  }));
}

function getDefaultFormatOptions(column, clientConfig) {
  const dateTimeFormat = {
    date: clientConfig.dateFormat || 'DD/MM/YY',
    datetime: clientConfig.dateTimeFormat || 'DD/MM/YY HH:mm',
  };
  const numberFormat = {
    integer: clientConfig.integerFormat || '0,0',
    float: clientConfig.floatFormat || '0,0.00',
  };
  return {
    dateTimeFormat: dateTimeFormat[column.type],
    numberFormat: numberFormat[column.type],
    booleanValues: clientConfig.booleanValues || ['false', 'true'],
  };
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

function getColumnsToDisplay(columns, options, clientConfig) {
  columns = _.object(_.map(columns, col => [col.name, col]));
  let result = _.map(options, col => _.extend(
    getDefaultFormatOptions(col, clientConfig),
    col,
    columns[col.name],
  ));

  result = _.map(result, col => _.extend(col, {
    formatFunction: createFormatter(col),
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
    controller($scope) {
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
          $scope.gridColumns = getColumnsToDisplay(columns, columnsOptions, clientConfig);
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

function GridEditor(clientConfig) {
  return {
    restrict: 'E',
    template: editorTemplate,
    link: ($scope) => {
      $scope.allowedItemsPerPage = [5, 10, 15, 20, 25];
      $scope.displayAsOptions = [
        { name: 'Text', value: 'string' },
        { name: 'Number', value: 'number' },
        { name: 'Date/Time', value: 'datetime' },
        { name: 'Boolean', value: 'boolean' },
        { name: 'JSON', value: 'json' },
      ];

      $scope.currentTab = 'grid';
      $scope.setCurrentTab = (tab) => {
        $scope.currentTab = tab;
      };

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (!queryResult) {
          return;
        }
        if ($scope.queryResult.getData() == null) {
          $scope.visualization.options.columns = [];
        } else {
          const columns = $scope.queryResult.getColumns();
          $scope.visualization.options.columns = _.map(
            getColumnsOptions(columns, $scope.visualization.options.columns),
            col => _.extend(getDefaultFormatOptions(col, clientConfig), col),
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
