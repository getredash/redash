(function () {
  var dateFormatter = function (value) {
    if (!value) {
      return "-";
    }

    return value.format(clientConfig.dateTimeFormat);
  };

  var MainCtrl = function ($scope, $location, Dashboard) {
    $scope.$on("$routeChangeSuccess", function (event, current, previous, rejection) {
      if ($scope.showPermissionError) {
        $scope.showPermissionError = false;
      }
    });

    $scope.$on("$routeChangeError", function (event, current, previous, rejection) {
      if (rejection.status === 403) {
        $scope.showPermissionError = true;
      }
    });

    $scope.location = String(document.location);
    $scope.version = clientConfig.version;
    $scope.newVersionAvailable = clientConfig.newVersionAvailable && currentUser.hasPermission("admin");

    $scope.newDashboard = {
      'name': null,
      'layout': null
    }
  };

  angular.module('redash.controllers', [])
    .controller('IndexCtrl', ['$scope', 'Events', 'Dashboard', 'Query', IndexCtrl])
    .controller('MainCtrl', ['$scope', '$location', 'Dashboard', MainCtrl])
    .controller('QuerySearchCtrl', ['$scope', '$location', '$filter', 'Events', 'Query',  QuerySearchCtrl])
})();
