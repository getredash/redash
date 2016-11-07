(function () {
  var dateFormatter = function (value) {
    if (!value) {
      return "-";
    }

    return value.format(clientConfig.dateTimeFormat);
  };

  var QuerySearchCtrl = function($scope, $location, $filter, Events, Query) {
    $scope.$parent.pageTitle = "Queries Search";

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };

    $scope.gridColumns = [
      {
        "label": "Name",
        "map": "name",
        "cellTemplateUrl": "/views/queries_query_name_cell.html"
      },
      {
        'label': 'Created By',
        'map': 'user.name'
      },
      {
        'label': 'Created At',
        'map': 'created_at',
        'formatFunction': dateFormatter
      },
      {
        'label': 'Update Schedule',
        'map': 'schedule',
        'formatFunction': function (value) {
          return $filter('scheduleHumanize')(value);
        }
      }
    ];

    $scope.queries = [];
    $scope.$parent.term = $location.search().q;

    Query.search({q: $scope.term }, function(results) {
      $scope.queries = _.map(results, function(query) {
        query.created_at = moment(query.created_at);
        return query;
      });
    });

    $scope.search = function() {
      if (!angular.isString($scope.term) || $scope.term.trim() == "") {
        $scope.queries = [];
        return;
      }

      $location.search({q: $scope.term});
    };

    Events.record(currentUser, "search", "query", "", {"term": $scope.term});
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
