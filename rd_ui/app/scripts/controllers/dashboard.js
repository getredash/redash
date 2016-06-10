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

  var DashboardCtrl = function($scope, Events, Widget, $routeParams, $location, $http, $timeout, $q, $modal, Dashboard, User) {
    $scope.refreshEnabled = false;
    $scope.isFullscreen = false;
    $scope.refreshRate = 60;

    var renderDashboard = function (dashboard) {
      $scope.$parent.pageTitle = dashboard.name;

      var promises = [];

      _.each($scope.dashboard.widgets, function (row) {
        return _.each(row, function (widget) {
          if (widget.visualization) {
            var queryResult = widget.getQuery().getQueryResult();
            if (angular.isDefined(queryResult))
              promises.push(queryResult.toPromise());
          }
        });
      });

      $q.all(promises).then(function(queryResults) {
        var filters = {};
        _.each(queryResults, function(queryResult) {
          var queryFilters = queryResult.getFilters();
          _.each(queryFilters, function (queryFilter) {
            var hasQueryStringValue = _.has($location.search(), queryFilter.name);

            if (!(hasQueryStringValue || dashboard.dashboard_filters_enabled)) {
              // If dashboard filters not enabled, or no query string value given, skip filters linking.
              return;
            }

            if (!_.has(filters, queryFilter.name)) {
              var filter = _.extend({}, queryFilter);
              filters[filter.name] = filter;
              filters[filter.name].originFilters = [];
              if (hasQueryStringValue) {
                filter.current = $location.search()[filter.name];
              }

              $scope.$watch(function () { return filter.current }, function (value) {
                _.each(filter.originFilters, function (originFilter) {
                  originFilter.current = value;
                });
              });
            }

            // TODO: merge values.
            filters[queryFilter.name].originFilters.push(queryFilter);
          });
        });

        $scope.filters = _.values(filters);
      });
    }

    var loadDashboard = _.throttle(function () {
      $scope.dashboard = Dashboard.get({slug: $routeParams.dashboardSlug}, function (dashboard) {
          Events.record(currentUser, "view", "dashboard", dashboard.id);
          renderDashboard(dashboard);
        }, function () {
          // error...
          // try again. we wrap loadDashboard with throttle so it doesn't happen too often.\
          // we might want to consider exponential backoff and also move this as a general solution in $http/$resource for
          // all AJAX calls.
          loadDashboard();
        }
      );
    }, 1000);

    loadDashboard();

    var autoRefresh = function() {
      if ($scope.refreshEnabled) {
        $timeout(function() {
          Dashboard.get({
            slug: $routeParams.dashboardSlug
          }, function(dashboard) {
            var newWidgets = _.groupBy(_.flatten(dashboard.widgets), 'id');

            _.each($scope.dashboard.widgets, function(row) {
              _.each(row, function(widget, i) {
                var newWidget = newWidgets[widget.id][0];
                if (newWidget.visualization) {
                  if (newWidget && newWidget.visualization.query.latest_query_data_id != widget.visualization.query.latest_query_data_id) {
                    row[i] = new Widget(newWidget);
                  }
                }
              });
            });

            autoRefresh();
          });

        }, $scope.refreshRate);
      }
    };

    $scope.archiveDashboard = function () {
      if (confirm('Are you sure you want to archive the "' + $scope.dashboard.name + '" dashboard?')) {
        Events.record(currentUser, "archive", "dashboard", $scope.dashboard.id);
        $scope.dashboard.$delete(function () {
          $scope.$parent.reloadDashboards();
        });
      }
    }

    $scope.showSharePermissionsModal = function() {
        // Create scope for share permissions dialog and pass api path to it
        var scope = $scope.$new();
        $scope.api_access = 'api/access/Dashboard/' + $scope.dashboard.id;
        scope.params = {api_access: $scope.api_access};

        $modal.open({
          scope: scope,
          templateUrl: '/views/dialogs/share_permissions.html',
          controller: 'SharePermissionsCtrl'
        })
    }

    $scope.toggleFullscreen = function() {
      $scope.isFullscreen = !$scope.isFullscreen;
      $('body').toggleClass('headless');
      if ($scope.isFullscreen) {
        $location.search('fullscreen', true);
      } else {
        $location.search('fullscreen', null);
      }
    };

    if (_.has($location.search(), 'fullscreen')) {
      $scope.toggleFullscreen();
    }

    $scope.triggerRefresh = function() {
      $scope.refreshEnabled = !$scope.refreshEnabled;

      Events.record(currentUser, "autorefresh", "dashboard", $scope.dashboard.id, {'enable': $scope.refreshEnabled});

      if ($scope.refreshEnabled) {
        var refreshRate = _.min(_.map(_.flatten($scope.dashboard.widgets), function(widget) {
          if (widget.visualization) {
            var schedule = widget.visualization.query.schedule;
            if (schedule === null || schedule.match(/\d\d:\d\d/) !== null) {
              return 60;
            }
            return widget.visualization.query.schedule;
          }
        }));

        $scope.refreshRate = _.min([300, refreshRate]) * 1000;

        autoRefresh();
      }
    };

    $scope.openShareForm = function() {
      $modal.open({
        templateUrl: '/views/dashboard_share.html',
        size: 'sm',
        scope: $scope,
        controller: ['$scope', '$modalInstance', '$http', function($scope, $modalInstance, $http) {
          $scope.close = function() {
            $modalInstance.close();
          };

          $scope.toggleSharing = function() {
            var url = 'api/dashboards/' + $scope.dashboard.id + '/share';
            if ($scope.dashboard.publicAccessEnabled) {
              // disable
              $http.delete(url).success(function() {
                $scope.dashboard.publicAccessEnabled = false;
                delete $scope.dashboard.public_url;
              }).error(function() {
                $scope.dashboard.publicAccessEnabled = true;
                // TODO: show message
              })
            } else {
              $http.post(url).success(function(data) {
                $scope.dashboard.publicAccessEnabled = true;
                $scope.dashboard.public_url = data.public_url;
              }).error(function() {
                $scope.dashboard.publicAccessEnabled = false;
                // TODO: show message
              });
            }
          };
        }]
      });
    }
  };

  var WidgetCtrl = function($scope, $location, Events, Query, $modal) {
    $scope.editTextBox = function() {
      $modal.open({
        templateUrl: '/views/edit_text_box_form.html',
        scope: $scope,
        controller: ['$scope', '$modalInstance', 'growl', function($scope, $modalInstance, growl) {
          $scope.close = function() {
            $modalInstance.close();
          };

          $scope.saveWidget = function() {
            $scope.saveInProgress = true;
            $scope.widget.$save().then(function(response) {
              $scope.close();
            }).catch(function() {
              growl.addErrorMessage("Widget can not be updated");
            }).finally(function() {
              $scope.saveInProgress = false;
            });
          };
        }],
      });
    }

    $scope.deleteWidget = function() {
      if (!confirm('Are you sure you want to remove "' + $scope.widget.getName() + '" from the dashboard?')) {
        return;
      }

      Events.record(currentUser, "delete", "widget", $scope.widget.id);

      $scope.widget.$delete(function(response) {
        $scope.dashboard.widgets = _.map($scope.dashboard.widgets, function(row) {
          return _.filter(row, function(widget) {
            return widget.id != undefined;
          })
        });

        $scope.dashboard.widgets = _.filter($scope.dashboard.widgets, function(row) { return row.length > 0 });

        $scope.dashboard.layout = response.layout;
      });
    };

    Events.record(currentUser, "view", "widget", $scope.widget.id);

    $scope.reload = function(force) {
      var maxAge = $location.search()['maxAge'];
      if (force) {
        maxAge = 0;
      }
      $scope.queryResult = $scope.query.getQueryResult(maxAge);
    };

    if ($scope.widget.visualization) {
      Events.record(currentUser, "view", "query", $scope.widget.visualization.query.id);
      Events.record(currentUser, "view", "visualization", $scope.widget.visualization.id);

      $scope.query = $scope.widget.getQuery();
      $scope.reload(false);

      $scope.type = 'visualization';
    } else if ($scope.widget.restricted) {
      $scope.type = 'restricted';
    } else {
      $scope.type = 'textbox';
    }
  };

  angular.module('redash.controllers')
    .controller('DashboardCtrl', ['$scope', 'Events', 'Widget', '$routeParams', '$location', '$http', '$timeout', '$q', '$modal', 'Dashboard', 'User', DashboardCtrl])
    .controller('PublicDashboardCtrl', ['$scope', 'Events', 'Widget', '$routeParams', '$location', '$http', '$timeout', '$q', 'Dashboard', PublicDashboardCtrl])
    .controller('WidgetCtrl', ['$scope', '$location', 'Events', 'Query', '$modal', WidgetCtrl])

})();
