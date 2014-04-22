(function() {
  var DashboardCtrl = function($scope, Events, $routeParams, $http, $timeout, Dashboard) {
    Events.record(currentUser, "view", "dashboard", dashboard.id);

    $scope.refreshEnabled = false;
    $scope.refreshRate = 60;
    $scope.dashboard = Dashboard.get({
      slug: $routeParams.dashboardSlug
    }, function(dashboard) {
      $scope.$parent.pageTitle = dashboard.name;
    });

    var autoRefresh = function() {
      if ($scope.refreshEnabled) {
        $timeout(function() {
          Dashboard.get({
            slug: $routeParams.dashboardSlug
          }, function(dashboard) {
            var newWidgets = _.groupBy(_.flatten(dashboard.widgets), 'id');

            _.each($scope.dashboard.widgets, function(row) {
              _.each(row, function(widget, i) {
                var newWidget = newWidgets[widget.id];
                if (newWidget && newWidget[0].visualization.query.latest_query_data_id != widget.visualization.query.latest_query_data_id) {
                  row[i] = newWidget[0];
                }
              });
            });

            autoRefresh();
          });

        }, $scope.refreshRate);
      };
    }

    $scope.triggerRefresh = function() {
      $scope.refreshEnabled = !$scope.refreshEnabled;

      Events.record(currentUser, "autorefresh", "dashboard", dashboard.id, {'enable': $scope.refreshEnabled});

      if ($scope.refreshEnabled) {
        var refreshRate = _.min(_.flatten($scope.dashboard.widgets), function(widget) {
          return widget.visualization.query.ttl;
        }).visualization.query.ttl;

        $scope.refreshRate = _.max([120, refreshRate * 2]) * 1000;

        autoRefresh();
      }
    };
  };

  var WidgetCtrl = function($scope, Events, $http, $location, Query) {
    $scope.deleteWidget = function() {
      if (!confirm('Are you sure you want to remove "' + $scope.widget.visualization.name + '" from the dashboard?')) {
        return;
      }

      Events.record(currentUser, "delete", "widget", $scope.widget.id);

      $http.delete('/api/widgets/' + $scope.widget.id).success(function() {
        $scope.dashboard.widgets = _.map($scope.dashboard.widgets, function(row) {
          return _.filter(row, function(widget) {
            return widget.id != $scope.widget.id;
          })
        });
      });
    };

    // TODO: fire event for query view for each query
    Events.record(currentUser, "view", "widget", $scope.widget.id);
    Events.record(currentUser, "view", "query", $scope.widget.visualization.query.id);
    Events.record(currentUser, "view", "visualization", $scope.widget.visualization.id);

    $scope.query = new Query($scope.widget.visualization.query);
    $scope.queryResult = $scope.query.getQueryResult();

    $scope.updateTime = (new Date($scope.queryResult.getUpdatedAt())).toISOString();
    $scope.nextUpdateTime = moment(new Date(($scope.query.updated_at + $scope.query.ttl + $scope.query.runtime + 300) * 1000)).fromNow();

    $scope.updateTime = '';
  };

  angular.module('redash.controllers')
    .controller('DashboardCtrl', ['$scope', 'Events', '$routeParams', '$http', '$timeout', 'Dashboard', DashboardCtrl])
    .controller('WidgetCtrl', ['$scope', 'Events', '$http', '$location', 'Query', WidgetCtrl])

})();