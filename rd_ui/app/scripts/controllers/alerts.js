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

  var AlertCtrl = function($scope, $routeParams, $location, growl, Query, Events, Alert, Destination) {
    $scope.selectedTab = 'users';
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

  angular.module('redash.directives').directive('userSubscribers', ['AlertSubscription', 'growl', function (AlertSubscription, growl) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/alerts/userSubscribers.html',
      scope: {
        'alertId': '='
      },
      controller: function ($scope) {
        $scope.subscription = {};
        $scope.subscribers = [];
        $scope.enabled = !clientConfig.mailSettingsMissing;

        $scope.subscribers = AlertSubscription.query({alertId: $scope.alertId}, function(subscriptions) {
          $scope.subscribers = _.filter(subscriptions, function(subscription) { return typeof subscription.destination === "undefined"; });
        });
      }
    }
  }]);

  angular.module('redash.directives').directive('destinationSubscribers', ['$sce', 'AlertSubscription', 'Destination', 'growl', function ($sce, AlertSubscription, Destination, growl) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/alerts/destinationSubscribers.html',
      scope: {
        'alertId': '='
      },
      controller: function ($scope) {
        $scope.subscription = {};
        $scope.subscribers = [];
        $scope.destinations = [];

        Destination.query(function(destinations) {
          $scope.destinations = destinations;
          destinations.unshift({name: currentUser.name + ' (Email)', icon: 'fa-envelope', type: 'user'});
          $scope.subscription.destination = destinations[0];
        });

        $scope.destinationsDisplay = function(destination) {
          if (destination.destination) {
            destination = destination;
          }

          if (destination.user) {
            destination = {
              name: destination.user.name + ' (Email)',
              icon: 'fa-envelope',
              type: 'user'
            };
          }

          if (!destination) {
            return '';
          }
          return $sce.trustAsHtml('<i class="fa ' + destination.icon + '"></i>&nbsp;' + destination.name);
        };

        $scope.subscribers = AlertSubscription.query({alertId: $scope.alertId}, function(subscriptions) {
          // $scope.subscribers = _.filter(subscriptions, function(subscription) { return typeof subscription.destination !== "undefined"; });
        });

        $scope.saveSubscriber = function() {
            $scope.sub = new AlertSubscription({alert_id: $scope.alertId, destination_id: $scope.subscription.destination.id});
            $scope.sub.$save(function() {
              growl.addSuccessMessage("Subscribed.");
              $scope.subscribers.push($scope.sub);
            }, function(response) {
              growl.addErrorMessage("Failed saving subscription.");
            });
        };

        $scope.unsubscribe = function(subscriber) {
            $scope.sub = new AlertSubscription({alert_id: subscriber.alert_id, id: subscriber.id});
            $scope.sub.$delete(function() {
              growl.addSuccessMessage("Unsubscribed");
              $scope.subscribers = _.without($scope.subscribers, subscriber);
            }, function() {
              growl.addErrorMessage("Failed unsubscribing.");
            });
        };
      }
    }
  }]);

  angular.module('redash.directives').directive('subscribeButton', ['AlertSubscription', 'growl', function (AlertSubscription, growl) {
    return {
      restrict: 'E',
      replace: true,
      template: '<button class="btn btn-default" ng-click="toggleSubscription()" ng-bind="message"></button>',
      controller: function ($scope) {
        var updateMessage = function() {
          if ($scope.subscription) {
            $scope.message = "Unsubscribe";
          } else {
            $scope.message = "Subscribe";
          }
        }

        $scope.subscribers.$promise.then(function() {
          $scope.subscription = _.find($scope.subscribers, function(subscription) {
            return (subscription.user.email == currentUser.email);
          });

          updateMessage();
        });

        $scope.toggleSubscription = function() {
          if ($scope.subscription) {
            $scope.subscription.$delete(function() {
              $scope.subscribers = _.without($scope.subscribers, $scope.subscription);
              $scope.subscription = undefined;
              updateMessage();
            }, function() {
              growl.addErrorMessage("Failed saving subscription.");
            });
          } else {
            $scope.subscription = new AlertSubscription({alert_id: $scope.alertId});
            $scope.subscription.$save(function() {
              $scope.subscribers.push($scope.subscription);
              console.log($scope.subscribers);
              updateMessage();
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
    .controller('AlertCtrl', ['$scope', '$routeParams', '$location', 'growl', 'Query', 'Events', 'Alert', 'Destination', AlertCtrl])

})();
