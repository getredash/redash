(function () {
    var tableVisualization = angular.module('redash.visualization');

    tableVisualization.config(['VisualizationProvider', function(VisualizationProvider) {
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

                        var prepareGridData = function(data) {
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

                        $scope.gridColumns = _.map($scope.queryResult.getColumnCleanNames(), function (col, i) {
                            var columnDefinition = {
                                'label': $scope.queryResult.getColumnFriendlyNames()[i],
                                'map': col
                            };

                            var rawData = $scope.queryResult.getRawData();

                            if (rawData.length > 0) {
                                var exampleData = rawData[0][col];
                                if (angular.isNumber(exampleData)) {
                                    columnDefinition['formatFunction'] = 'number';
                                    columnDefinition['formatParameter'] = 2;
                                } else if (moment.isMoment(exampleData)) {
                                    columnDefinition['formatFunction'] = function(value) {
                                        // TODO: this is very hackish way to determine if we need
                                        // to show the value as a time or date only. Better solution
                                        // is to complete #70 and use the information it returns.
                                        if (value._i.match(/^\d{4}-\d{2}-\d{2}T/)) {
                                            return value.format("DD/MM/YY HH:mm");
                                        }
                                        return value.format("DD/MM/YY");
                                    }
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