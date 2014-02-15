(function () {
    var cohortVisualization = angular.module('redash.visualization.cohort', []);

    cohortVisualization.config(['VisualizationProvider', function(VisualizationProvider) {
        VisualizationProvider.registerVisualization('COHORT', 'Cohort', '<cohort-renderer options="visualization.options" query-result="queryResult"></cohort-renderer>', null);
    }]);

    cohortVisualization.directive('cohortRenderer', function() {
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
    });

}());