(function () {
  var AdminStatusCtrl = function ($scope, Events, $http, $timeout) {
    Events.record(currentUser, "view", "page", "admin/status");
    $scope.$parent.pageTitle = "System Status";

    var refresh = function () {
      $http.get('/status.json').success(function (data) {
        $scope.workers = data.workers;
        delete data.workers;
        $scope.manager = data.manager;
        delete data.manager;
        $scope.status = data;
      });

      var timer = $timeout(refresh, 59 * 1000);

      $scope.$on("$destroy", function () {
        if (timer) {
          $timeout.cancel(timer);
        }
      });
    };

    refresh();
  };

  var dateFormatter = function (value) {
    if (!value) {
      return "-";
    }

    return moment(value).format(clientConfig.dateTimeFormat);
  };

  var timestampFormatter = function(value) {
    if (value) {
      return dateFormatter(value * 1000.0);
    }

    return "-";
  }

  var AdminTasksCtrl = function ($scope, $location, Events, $http, $timeout, $filter) {
    Events.record(currentUser, "view", "page", "admin/tasks");
    $scope.$parent.pageTitle = "Running Queries";
    $scope.autoUpdate = true;

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };
    $scope.selectedTab = 'in_progress';
    $scope.tasks = {
      'pending': [],
      'in_progress': [],
      'done': []
    };

    $scope.allGridColumns = [
      {
        label: 'Data Source ID',
        map: 'data_source_id'
      },
      {
        label: 'Username',
        map: 'username'
      },
      {
        'label': 'State',
        'map': 'state',
        "cellTemplate": '{{dataRow.state}} <span ng-if="dataRow.state == \'failed\'" popover="{{dataRow.error}}" popover-trigger="mouseenter" class="zmdi zmdi-help"></span>'
      },
      {
        "label": "Query ID",
        "map": "query_id"
      },
      {
        label: 'Query Hash',
        map: 'query_hash'
      },
      {
        'label': 'Runtime',
        'map': 'run_time',
        'formatFunction': function (value) {
          return $filter('durationHumanize')(value);
        }
      },
      {
        'label': 'Created At',
        'map': 'created_at',
        'formatFunction': timestampFormatter
      },
      {
        'label': 'Started At',
        'map': 'started_at',
        'formatFunction': timestampFormatter
      },
      {
        'label': 'Updated At',
        'map': 'updated_at',
        'formatFunction': timestampFormatter
      }
    ];

    $scope.inProgressGridColumns = angular.copy($scope.allGridColumns);
    $scope.inProgressGridColumns.push({
      'label': '',
      "cellTemplate": '<cancel-query-button query-id="dataRow.query_id" task-id="dataRow.task_id"></cancel-query-button>'
    });

    $scope.setTab = function(tab) {
      $scope.selectedTab = tab;
      $scope.showingTasks = $scope.tasks[tab];
      if (tab == 'in_progress') {
        $scope.gridColumns = $scope.inProgressGridColumns;
      } else {
        $scope.gridColumns = $scope.allGridColumns;
      }
    };

    $scope.setTab($location.hash() || 'in_progress');

    var refresh = function () {
      if ($scope.autoUpdate) {
        $scope.refresh_time = moment().add(1, 'minutes');
        $http.get('/api/admin/queries/tasks').success(function (data) {
          $scope.tasks = data;
          $scope.showingTasks = $scope.tasks[$scope.selectedTab];
        });
      }

      var timer = $timeout(refresh, 5 * 1000);

      $scope.$on("$destroy", function () {
        if (timer) {
          $timeout.cancel(timer);
        }
      });
    };

    refresh();
  };

  var AdminOutdatedQueriesCtrl = function ($scope, Events, $http, $timeout, $filter) {
    Events.record(currentUser, "view", "page", "admin/outdated_queries");
    $scope.$parent.pageTitle = "Outdated Queries";
    $scope.autoUpdate = true;

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };

    $scope.gridColumns = [
      {
        label: 'Data Source ID',
        map: 'data_source_id'
      },
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
        'label': 'Runtime',
        'map': 'runtime',
        'formatFunction': function (value) {
          return $filter('durationHumanize')(value);
        }
      },
      {
        'label': 'Last Executed At',
        'map': 'retrieved_at',
        'formatFunction': dateFormatter
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

    var refresh = function () {
      if ($scope.autoUpdate) {
        $scope.refresh_time = moment().add(1, 'minutes');
        $http.get('/api/admin/queries/outdated').success(function (data) {
          $scope.queries = data.queries;
          $scope.updatedAt = data.updated_at * 1000.0;
        });
      }

      // var timer = $timeout(refresh, 59 * 1000);
      var timer = $timeout(refresh, 10 * 1000);

      $scope.$on("$destroy", function () {
        if (timer) {
          $timeout.cancel(timer);
        }
      });
    };

    refresh();
  };

  var cancelQueryButton = function () {
    return {
      restrict: 'E',
      scope: {
        'queryId': '=',
        'taskId': '='
      },
      transclude: true,
      template: '<button class="btn btn-default" ng-disabled="inProgress" ng-click="cancelExecution()"><i class="zmdi zmdi-spinner zmdi-hc-spin" ng-if="inProgress"></i> Cancel</button>',
      replace: true,
      controller: ['$scope', '$http', 'Events', function ($scope, $http, Events) {
        $scope.inProgress = false;

        $scope.cancelExecution = function() {
          $http.delete('api/jobs/' + $scope.taskId).success(function() {
          });

          var queryId = $scope.queryId;
          if ($scope.queryId == 'adhoc') {
            queryId = null;
          }

          Events.record(currentUser, 'cancel_execute', 'query', queryId, {'admin': true});
          $scope.inProgress = true;
        }
      }]
    }
  };

  angular.module('redash.admin_controllers', [])
         .controller('AdminStatusCtrl', ['$scope', 'Events', '$http', '$timeout', AdminStatusCtrl])
         .controller('AdminTasksCtrl', ['$scope', '$location', 'Events', '$http', '$timeout', '$filter', AdminTasksCtrl])
         .controller('AdminOutdatedQueriesCtrl', ['$scope', 'Events', '$http', '$timeout', '$filter', AdminOutdatedQueriesCtrl])
         .directive('cancelQueryButton', cancelQueryButton)
})();
