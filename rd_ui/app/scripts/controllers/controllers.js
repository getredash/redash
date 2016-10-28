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

  var QueriesCtrl = function ($scope, $http, $location, $filter, Query) {
    var loader;

    $scope.queries = [];
    $scope.page = parseInt($location.search().page || 1);
    $scope.total = undefined;
    $scope.pageSize = 25;

    function loadQueries(resource, defaultOptions) {
      return function(options) {
        options = _.extend({}, defaultOptions, options);
        resource(options, function (queries) {
          $scope.totalQueriesCount = queries.count;
          $scope.queries = _.map(queries.results, function (query) {
            query.created_at = moment(query.created_at);
            query.retrieved_at = moment(query.retrieved_at);
            return query;
          });
        });
      }
    }

    switch($location.path()) {
      case '/queries':
        $scope.$parent.pageTitle = "Queries";
        // page title
        loader = loadQueries(Query.query);
        break;
      case '/queries/drafts':
        $scope.$parent.pageTitle = "Drafts";
        loader = loadQueries(Query.myQueries, {drafts: true});
        break;
      case '/queries/my':
        $scope.$parent.pageTitle = "My Queries";
        loader = loadQueries(Query.myQueries);
        break;
    }

    var loadAllQueries = loadQueries(Query.query);
    var loadMyQueries = loadQueries(Query.myQueries);

    function load() {
      var options = {page: $scope.page, page_size: $scope.pageSize};
      loader(options);
    }

    $scope.selectPage = function(page) {
      $location.search('page', page);
      $scope.page = page;
      load();
    }

    $scope.tabs = [
      {"name": "My Queries", "path": "queries/my", loader: loadMyQueries},
      {"path": "queries", "name": "All Queries", isActive: function(path) {
        return path === '/queries';
      }, "loader": loadAllQueries},
      {"path": "queries/drafts", "name": "Drafts", loader: loadMyQueries},
    ];

    load();
  }

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

  var IndexCtrl = function ($scope, Events, Dashboard, Query) {
    Events.record(currentUser, "view", "page", "personal_homepage");
    $scope.$parent.pageTitle = "Home";

    $scope.recentQueries = Query.recent();
    $scope.recentDashboards = Dashboard.recent();
  };

  // Controller for modal window share_permissions, works for both query and dashboards, needs apiAccess set in scope
  var ManagePermissionsCtrl = function ($scope, $http, $modalInstance, User) {
      $scope.grantees = [];
      $scope.newGrantees = {};

      // List users that are granted permissions
      var loadGrantees = function() {
        $http.get($scope.apiAccess).success(function(result) {
          $scope.grantees = [];
          for(var access_type in result) {
            result[access_type].forEach(function(grantee) {
              var item = grantee;
              item['access_type'] = access_type;
              $scope.grantees.push(item);
            })
          }
        });
      };

      loadGrantees();

      // Search for user
      $scope.findUser = function(search) {
        if (search == "") {
          return;
        }

        if ($scope.foundUsers === undefined) {
          User.query(function(users) {
            var existingIds = _.map($scope.grantees, function(m) { return m.id; });
            _.each(users, function(user) { user.alreadyGrantee = _.contains(existingIds, user.id); });
            $scope.foundUsers = users;
          });
        }
      };

      // Add new user to grantees list
      $scope.addGrantee = function(user) {
        $scope.newGrantees.selected = undefined;
        var body = {'access_type': 'modify', 'user_id': user.id};
        $http.post($scope.apiAccess, body).success(function() {
          user.alreadyGrantee = true;
          loadGrantees();
        });
      };

      // Remove user from grantees list
      $scope.removeGrantee = function(user) {
        var body = {'access_type': 'modify', 'user_id': user.id};
        $http({ url: $scope.apiAccess, method: 'DELETE',
                data: body, headers: {"Content-Type": "application/json"}
        }).success(function() {
          $scope.grantees = _.filter($scope.grantees, function(m) {  return m != user });

          if ($scope.foundUsers) {
            _.each($scope.foundUsers, function(u) { if (u.id == user.id) { u.alreadyGrantee = false }; });
          }
        });
      };

      $scope.close = function() {
        $modalInstance.close();
      }
  };


  angular.module('redash.controllers', [])
    .controller('QueriesCtrl', ['$scope', '$http', '$location', '$filter', 'Query', QueriesCtrl])
    .controller('IndexCtrl', ['$scope', 'Events', 'Dashboard', 'Query', IndexCtrl])
    .controller('MainCtrl', ['$scope', '$location', 'Dashboard', MainCtrl])
    .controller('QuerySearchCtrl', ['$scope', '$location', '$filter', 'Events', 'Query',  QuerySearchCtrl])
    .controller('ManagePermissionsCtrl', ['$scope', '$http', '$modalInstance', 'User', ManagePermissionsCtrl]);
})();
