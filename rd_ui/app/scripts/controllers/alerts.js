(function() {

  var AlertsCtrl = function($scope, Events, Alert) {
    Events.record(currentUser, "view", "page", "alerts");
    $scope.$parent.pageTitle = "Alerts";

    $scope.alerts = []
    Alert.query(function(alerts) {
      var stateClass = {
        'ok': 'label label-success',
        'triggered': 'label label-danger',
        'unknown': 'label label-warning'
      };
      _.each(alerts, function(alert) {
        alert.class = stateClass[alert.state];
      })
      $scope.alerts = alerts;

    });

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };


    $scope.gridColumns = [
      {
        "label": "Name",
        "map": "name",
        "cellTemplate": '<a href="alerts/{{dataRow.id}}">{{dataRow.name}}</a> (<a href="queries/{{dataRow.query.id}}">query</a>)'
      },
      {
        'label': 'Created By',
        'map': 'user.name'
      },
      {
        'label': 'State',
        'cellTemplate': '<span ng-class="dataRow.class">{{dataRow.state | uppercase}}</span> since <span am-time-ago="dataRow.updated_at"></span>'
      },
      {
        'label': 'Created At',
        'cellTemplate': '<span am-time-ago="dataRow.created_at"></span>'
      }
    ];
  };

  var AlertCtrl = function($scope, $routeParams, $location, growl, Query, Events, Alert) {
    $scope.$parent.pageTitle = "Alerts";

    $scope.alertId = $routeParams.alertId;
    if ($scope.alertId === "new") {
      Events.record(currentUser, 'view', 'page', 'alerts/new');
    } else {
      Events.record(currentUser, 'view', 'alert', $scope.alertId);
    }

    $scope.onQuerySelected = function(item) {
      $scope.selectedQuery = item;
      item.getQueryResultPromise().then(function(result) {
        $scope.queryResult = result;
        $scope.alert.options.column = $scope.alert.options.column || result.getColumnNames()[0];
      });
    };

    if ($scope.alertId === "new") {
      $scope.alert = new Alert({options: {}});
    } else {
      $scope.alert = Alert.get({id: $scope.alertId}, function(alert) {
        $scope.onQuerySelected(new Query($scope.alert.query));
      });
    }

    $scope.ops = ['greater than', 'less than', 'equals'];
    $scope.selectedQuery = null;

    $scope.getDefaultName = function() {
      if (!$scope.alert.query) {
        return undefined;
      }
      return _.template("<%= query.name %>: <%= options.column %> <%= options.op %> <%= options.value %>", $scope.alert);
    };

    $scope.searchQueries = function (term) {
      if (!term || term.length < 3) {
        return;
      }

      Query.search({q: term}, function(results) {
        $scope.queries = results;
      });
    };

    $scope.saveChanges = function() {
      if ($scope.alert.name === undefined || $scope.alert.name === '') {
        $scope.alert.name = $scope.getDefaultName();
      }
      if ($scope.alert.rearm === '' || $scope.alert.rearm === 0) {
        $scope.alert.rearm = null;
      }
      $scope.alert.$save(function(alert) {
        growl.addSuccessMessage("Saved.");
        if ($scope.alertId === "new") {
           $location.path('/alerts/' + alert.id).replace();
        }
      }, function() {
        growl.addErrorMessage("Failed saving alert.");
      });
    };
  };

  angular.module('redash.directives').directive('alertSubscribers', ['AlertSubscription', function (AlertSubscription) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/alerts/subscribers.html',
      scope: {
        'alertId': '='
      },
      controller: function ($scope) {
        $scope.subscribers = AlertSubscription.query({alertId: $scope.alertId});
      }
    }
  }]);

  angular.module('redash.directives').directive('subscribeButton', ['AlertSubscription', 'growl', function (AlertSubscription, growl) {
    return {
      restrict: 'E',
      replace: true,
      template: '<button class="btn btn-default btn-xs" ng-click="toggleSubscription()"><i ng-class="class"></i></button>',
      controller: function ($scope) {
        var updateClass = function() {
          if ($scope.subscription) {
            $scope.class = "fa fa-eye-slash";
          } else {
            $scope.class = "fa fa-eye";
          }
        }

        $scope.subscribers.$promise.then(function() {
          $scope.subscription = _.find($scope.subscribers, function(subscription) {
            return (subscription.user.email == currentUser.email);
          });

          updateClass();
        });

        $scope.toggleSubscription = function() {
          if ($scope.subscription) {
            $scope.subscription.$delete(function() {
              $scope.subscribers = _.without($scope.subscribers, $scope.subscription);
              $scope.subscription = undefined;
              updateClass();
            }, function() {
              growl.addErrorMessage("Failed saving subscription.");
            });
          } else {
            $scope.subscription = new AlertSubscription({alert_id: $scope.alertId});
            $scope.subscription.$save(function() {
              $scope.subscribers.push($scope.subscription);
              updateClass();
            }, function() {
              growl.addErrorMessage("Unsubscription failed.");
            });
          }
        }
      }
    }
  }]);

  angular.module('redash.controllers')
    .controller('AlertsCtrl', ['$scope', 'Events', 'Alert', AlertsCtrl])
    .controller('AlertCtrl', ['$scope', '$routeParams', '$location', 'growl', 'Query', 'Events', 'Alert', AlertCtrl])

})();
