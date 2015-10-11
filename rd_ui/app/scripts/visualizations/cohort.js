(function () {
  var cohortVisualization = angular.module('redash.visualization');

  cohortVisualization.config(['VisualizationProvider', function (VisualizationProvider) {

    var editTemplate = '<cohort-editor></cohort-editor>';
    var defaultOptions = {
      'timeInterval': 'daily'
    };

    VisualizationProvider.registerVisualization({
      type: 'COHORT',
      name: 'Cohort',
      renderTemplate: '<cohort-renderer options="visualization.options" query-result="queryResult"></cohort-renderer>',
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }]);

  cohortVisualization.directive('cohortRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '=',
        options: '='
      },
      template: "",
      replace: false,
      link: function ($scope, element, attrs) {
        $scope.options.timeInterval = $scope.options.timeInterval || 'daily';

        var updateCohort = function () {
          if ($scope.queryResult.getData() === null) {
            return;
          }

          var sortedData = _.sortBy($scope.queryResult.getData(), function (r) {
            return r['date'] + r['day_number'];
          });

          var grouped = _.groupBy(sortedData, "date");

          var maxColumns = _.reduce(grouped, function (memo, data) {
            return (data.length > memo) ? data.length : memo;
          }, 0);

          var data = _.map(grouped, function (values, date) {
            var row = [values[0].total];
            _.each(values, function (value) {
              row.push(value.value);
            });
            _.each(_.range(values.length, maxColumns), function () {
              row.push(null);
            });
            return row;
          });

          var initialDate = moment(sortedData[0].date).toDate(),
            container = angular.element(element)[0];

          Cornelius.draw({
            initialDate: initialDate,
            container: container,
            cohort: data,
            title: null,
            timeInterval: $scope.options.timeInterval,
            labels: {
              time: 'Time',
              people: 'Users',
              weekOf: 'Week of'
            }
          });
        }

        $scope.$watch('queryResult && queryResult.getData()', updateCohort);
        $scope.$watch('options.timeInterval', updateCohort);
      }
    }
  });
  cohortVisualization.directive('cohortEditor', function () {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/cohort_editor.html'
    }
  });

}());
