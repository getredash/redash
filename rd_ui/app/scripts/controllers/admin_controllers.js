(function () {
  var AdminStatusCtrl = function ($scope, Events, $http, $timeout) {
    Events.record(currentUser, "view", "page", "admin/status");
    $scope.$parent.pageTitle = "System Status";

    var refresh = function () {
      $scope.refresh_time = moment().add('minutes', 1);
      $http.get('/status.json').success(function (data) {
        $scope.workers = data.workers;
        delete data.workers;
        $scope.manager = data.manager;
        delete data.manager;
        $scope.status = data;
      });

      $timeout(refresh, 59 * 1000);
    };

    refresh();
  }

  var AdminGroupsCtrl = function ($scope, Events, Group) {
     var group = new Group();
     group.getGroups().$promise.then(function(groups) {
        $scope.groups = groups;
     });
  }

  angular.module('redash.admin_controllers', [])
         .controller('AdminStatusCtrl', ['$scope', 'Events', '$http', '$timeout', AdminStatusCtrl])
         .controller('AdminGroupsCtrl', ['$scope', 'Events', 'Group', AdminGroupsCtrl])
})();


// $scope.gridColumns = [
//       {
//         "label": "Name",
//         "map": "name",
//         "cellTemplateUrl": "/views/queries_query_name_cell.html"
//       },
//       {
//         'label': 'Created By',
//         'map': 'user.name'
//       },
//       {
//         'label': 'Created At',
//         'map': 'created_at',
//         'formatFunction': dateFormatter
//       },
//       {
//         'label': 'Runtime (avg)',
//         'map': 'avg_runtime',
//         'formatFunction': function (value) {
//           return $filter('durationHumanize')(value);
//         }
//       },
//       {
//         'label': 'Runtime (min)',
//         'map': 'min_runtime',
//         'formatFunction': function (value) {
//           return $filter('durationHumanize')(value);
//         }
//       },
//       {
//         'label': 'Runtime (max)',
//         'map': 'max_runtime',
//         'formatFunction': function (value) {
//           return $filter('durationHumanize')(value);
//         }
//       },
//       {
//         'label': 'Last Executed At',
//         'map': 'last_retrieved_at',
//         'formatFunction': dateFormatter
//       },
//       {
//         'label': 'Times Executed',
//         'map': 'times_retrieved'
//       },
//       {
//         'label': 'Update Schedule',
//         'map': 'ttl',
//         'formatFunction': function (value) {
//           return $filter('refreshRateHumanize')(value);
//         }
//       }
//     ]