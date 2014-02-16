(function () {
    var tableVisualization = angular.module('redash.visualization');

    tableVisualization.config(['VisualizationProvider', function(VisualizationProvider) {
        VisualizationProvider.registerVisualization('TABLE', 'Table', '<grid-renderer options="visualization.options" query-result="queryResult"></grid-renderer>', null, {}, true);
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
            controller: ['$scope', function ($scope) {
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

                        var gridData = _.map($scope.queryResult.getData(), function (row) {
                            var newRow = {};
                            _.each(row, function (val, key) {
                                newRow[$scope.queryResult.getColumnCleanName(key)] = val;
                            })
                            return newRow;
                        });

                        $scope.gridColumns = _.map($scope.queryResult.getColumnCleanNames(), function (col, i) {
                            var columnDefinition = {
                                'label': $scope.queryResult.getColumnFriendlyNames()[i],
                                'map': col
                            };

                            if (gridData.length > 0) {
                                var exampleData = gridData[0][col];
                                if (angular.isNumber(exampleData)) {
                                    columnDefinition['formatFunction'] = 'number';
                                    columnDefinition['formatParameter'] = 2;
                                } else if (moment.isMoment(exampleData)) {
                                    columnDefinition['formatFunction'] = function(value) {
                                        return value.format("DD/MM/YY HH:mm");
                                    }
                                }
                            }

                            return columnDefinition;
                        });

                        $scope.gridData = _.clone(gridData);

                        $scope.$watch('filters', function (filters) {
                            $scope.gridData = _.filter(gridData, function (row) {
                                return _.reduce(filters, function (memo, filter) {
                                    if (filter.current == 'All') {
                                        return memo && true;
                                    }

                                    return (memo && row[$scope.queryResult.getColumnCleanName(filter.name)] == filter.current);
                                }, true);
                            });
                        }, true);
                    }
                });
            }]
        }
    })
}());