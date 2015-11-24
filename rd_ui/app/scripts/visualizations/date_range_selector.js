(function (window) {
  var module = angular.module('redash.visualization');

  module.directive('dateRangeSelector', [function () {
    return {
      restrict: 'E',
      scope: {
        dateRange: "="
      },
      templateUrl: '/views/visualizations/date_range_selector.html',
      replace: true,
      controller: ['$scope', function ($scope) {
        $scope.dateRangeHuman = {
          min: null,
          max: null
        };

        $scope.$watch('dateRange', function (dateRange, oldDateRange, scope) {
          scope.dateRangeHuman.min = dateRange.min.format('YYYY-MM-DD');
          scope.dateRangeHuman.max = dateRange.max.format('YYYY-MM-DD');
        });

        $scope.$watch('dateRangeHuman', function (dateRangeHuman, oldDateRangeHuman, scope) {
          var newDateRangeMin = moment.utc(dateRangeHuman.min);
          var newDateRangeMax = moment.utc(dateRangeHuman.max);
          if (!newDateRangeMin ||
              !newDateRangeMax ||
              !newDateRangeMin.isValid() ||
              !newDateRangeMax.isValid() ||
              newDateRangeMin.isAfter(newDateRangeMax)) {
            // Prevent invalid date input
            // No need to show up a notification to user here, it will be too noisy.
            // Instead, simply preventing changes to the scope silently.
            scope.dateRangeHuman = oldDateRangeHuman;
            return;
          }
          scope.dateRange.min = newDateRangeMin;
          scope.dateRange.max = newDateRangeMax;
        }, true);
      }]
    }
  }]);
})(window);
