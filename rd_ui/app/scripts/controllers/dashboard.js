(function() {
  var PublicDashboardCtrl = function($scope, Events, Widget, $routeParams, $location, $http, $timeout, $q, Dashboard) {
    $scope.dashboard = seedData.dashboard;
    $scope.public = true;
    $scope.dashboard.widgets = _.map($scope.dashboard.widgets, function (row) {
      return _.map(row, function (widget) {
        return new Widget(widget);
      });
    });
  };

  angular.module('redash.controllers')
    .controller('DashboardCtrl', ['$scope', 'Events', 'Widget', '$routeParams', '$location', '$http', '$timeout', '$q', '$modal', 'Dashboard', DashboardCtrl])
    .controller('PublicDashboardCtrl', ['$scope', 'Events', 'Widget', '$routeParams', '$location', '$http', '$timeout', '$q', 'Dashboard', PublicDashboardCtrl])
    .controller('WidgetCtrl', ['$scope', '$location', 'Events', 'Query', '$modal', WidgetCtrl])

})();
