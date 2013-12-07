var renderers = angular.module('redash.renderers', []);
var defaultChartOptions = {
    "title": {
        "text": null
    },
    "tooltip": {
        valueDecimals: 2,
        formatter: function () {
            if (moment.isMoment(this.x)) {
                var s = '<b>' + moment(this.x).format("DD/MM/YY HH:mm") + '</b>',
                    pointsCount = this.points.length;

                $.each(this.points, function (i, point) {
                    s += '<br/><span style="color:'+point.series.color+'">' + point.series.name + '</span>: ' +
                        Highcharts.numberFormat(point.y);

                    if (pointsCount > 1 && point.percentage) {
                        s += " (" + Highcharts.numberFormat(point.percentage) + "%)";
                    }
                });
            } else {
                var s = "<b>" + this.points[0].key + "</b>";
                $.each(this.points, function (i, point) {
                    s+= '<br/><span style="color:'+point.series.color+'">' + point.series.name + '</span>: ' +
                        Highcharts.numberFormat(point.y);
                });
            }

            return s;
        },
        shared: true
    },
    xAxis: {
        type: 'datetime'
    },
    yAxis: {
        title: {
            text: null
        }
    },
    exporting: {
        chartOptions: {
            title: {
                text: this.description
            }
        },
        buttons: {
            contextButton: {
                menuItems: [
                    {
                        text: 'Toggle % Stacking',
                        onclick: function () {
                            var newStacking = "normal";
                            if (this.series[0].options.stacking == "normal") {
                                newStacking = "percent";
                            }

                            _.each(this.series, function (series) {
                                series.update({stacking: newStacking}, true);
                            });
                        }
                    }
                ]
            }
        }
    },
    credits: {
        enabled: false
    },
    plotOptions: {
        "column": {
            "stacking": "normal",
            "pointPadding": 0,
            "borderWidth": 1,
            "groupPadding": 0,
            "shadow": false
        }
    },
    "series": []
};

renderers.directive('chartRenderer', function () {
    return {
        restrict: 'E',
        scope: {
            queryResult: '=',
            stacking: '&'
        },
        template: "<chart options='chartOptions' series='chartSeries' class='graph'></chart>",
        replace: false,
        controller: ['$scope', function ($scope) {
            $scope.chartSeries = [];
            $scope.chartOptions = defaultChartOptions;

            $scope.$watch('queryResult && queryResult.getData()', function (data) {
                if (!data || $scope.queryResult.getData() == null) {
                    $scope.chartSeries.splice(0, $scope.chartSeries.length);
                } else {
                    $scope.chartSeries.splice(0, $scope.chartSeries.length);

                    var stacking = null;
                    if ($scope.stacking() === undefined) {
                        stacking = 'normal';
                    }

                    _.each($scope.queryResult.getChartData(), function (s) {
                        $scope.chartSeries.push(_.extend(s, {'stacking': stacking}));
                    });
                }
            });
        }]
    }
})

renderers.directive('gridRenderer', function () {
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
            }

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
                            // TODO: hack to detect date fields, needed only for backward compatability
                            if (val > 1000 * 1000 * 1000 * 100) {
                                newRow[$scope.queryResult.getColumnCleanName(key)] = moment(val);
                            } else {
                                newRow[$scope.queryResult.getColumnCleanName(key)] = val;
                            }

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

renderers.directive('pivotTableRenderer', function () {
    return {
        restrict: 'E',
        scope: {
            queryResult: '='
        },
        template: "",
        replace: false,
        link: function($scope, element, attrs) {
            $scope.$watch('queryResult && queryResult.getData()', function (data) {
                if (!data) {
                    return;
                }

                if ($scope.queryResult.getData() == null) {
                } else {
                    $(element).pivotUI($scope.queryResult.getData(), {
                         renderers: $.pivotUtilities.renderers
                    }, true);
                }
            });
        }
    }
})

renderers.directive('cohortRenderer', function() {
    return {
        restrict: 'E',
        scope: {
            queryResult: '='
        },
        template: "",
        replace: false,
        link: function($scope, element, attrs) {
            $scope.$watch('queryResult && queryResult.getData()', function (data) {
                if (!data) {
                    return;
                }

                if ($scope.queryResult.getData() == null) {

                } else {
                    var sortedData = _.sortBy($scope.queryResult.getData(), "date");
                    var grouped = _.groupBy(sortedData, "date");
                    var data = _.map(grouped, function(values, date) {
                       var row = [values[0].total];
                        _.each(values, function(value) { row.push(value.value); });
                        return row;
                    });

                    var initialDate = moment(sortedData[0].date).toDate(),
                        container = angular.element(element)[0];

                    Cornelius.draw({
                        initialDate: initialDate,
                        container: container,
                        cohort: data,
                        title: null,
                        timeInterval: 'daily',
                        labels: {
                            time: 'Activation Day',
                            people: 'Users'
                        },
                        formatHeaderLabel: function (i) {
                            return "Day " + (i - 1);
                        }
                    });
                }
            });
        }
    }
})