(function () {
  var tableVisualization = angular.module('redash.visualization');

  tableVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    VisualizationProvider.registerVisualization({
      type: 'TABLE',
      name: 'Table',
      renderTemplate: '<grid-renderer options="visualization.options" query-result="queryResult"></grid-renderer>',
      skipTypes: true
    });
  }]);

  tableVisualization.directive('gridRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '=',
        itemsPerPage: '='
      },
      templateUrl: "/views/grid_renderer.html",
      replace: false,
      controller: ['$scope', '$filter', function ($scope, $filter) {
        $scope.gridColumns = [];
        $scope.gridData = [];
        $scope.gridConfig = {
          isPaginationEnabled: true,
          itemsByPage: $scope.itemsPerPage || 15,
          maxSize: 8
        };

        $scope.$watch('queryResult && queryResult.getData()', function (data) {
          if (!data) {
            return;
          }

          if ($scope.queryResult.getData() == null) {
            $scope.gridColumns = [];
            $scope.gridData = [];
            $scope.filters = [];
          } else {
            $scope.filters = $scope.queryResult.getFilters();

            var prepareGridData = function (data) {
              var gridData = _.map(data, function (row) {
                var newRow = {};
                _.each(row, function (val, key) {
                  newRow[$scope.queryResult.getColumnCleanName(key)] = val;
                })
                return newRow;
              });

              return gridData;
            };

            $scope.gridData = prepareGridData($scope.queryResult.getData());

            var columns = $scope.queryResult.getColumns();
            $scope.gridColumns = _.map($scope.queryResult.getColumnCleanNames(), function (col, i) {
              var columnDefinition = {
                'label': $scope.queryResult.getColumnFriendlyNames()[i],
                'map': col
              };

              var columnType = columns[i].type;

              if (columnType === 'integer') {
                columnDefinition.formatFunction = 'number';
                columnDefinition.formatParameter = 0;
              } else if (columnType === 'float') {
                columnDefinition.formatFunction = 'number';
                columnDefinition.formatParameter = 2;
              } else if (columnType === 'boolean') {
                columnDefinition.formatFunction = function (value) {
                  if (value !== undefined) {
                    return "" + value;
                  }
                  return value;
                };
              } else if (columnType === 'date') {
                columnDefinition.formatFunction = function (value) {
                  if (value && moment.isMoment(value)) {
                    return value.format(clientConfig.dateFormat);
                  }
                  return value;
                };
              } else if (columnType === 'datetime') {
                columnDefinition.formatFunction = function (value) {
                  if (value && moment.isMoment(value)) {
                    return value.format(clientConfig.dateTimeFormat);
                  }
                  return value;
                };
              } else {
                columnDefinition.formatFunction = function (value) {
                  if (angular.isString(value)) {
                    value = $filter('linkify')(value);
                  }
                  return value;
                }
              }

              return columnDefinition;
            });
          }
        });
      }]
    }
  })
}());