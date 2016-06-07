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

  angular.module('redash.directives').directive('alertSubscriptions', ['$q', '$sce', 'AlertSubscription', 'Destination', 'growl', function ($q, $sce, AlertSubscription, Destination, growl) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/alerts/alert_subscriptions.html',
      scope: {
        'alertId': '='
      },
      controller: function ($scope) {
        $scope.newSubscription = {};
        $scope.subscribers = [];
        $scope.destinations = [];
        $scope.currentUser = currentUser;

        var destinations = Destination.query().$promise;
        var subscribers = AlertSubscription.query({alertId: $scope.alertId}).$promise;

        $q.all([destinations, subscribers]).then(function(responses) {
          var destinations = responses[0];
          var subscribers = responses[1];

          var subscribedDestinations = _.compact(_.map(subscribers, function(s) { return s.destination && s.destination.id }));
          var subscribedUsers = _.compact(_.map(subscribers, function(s) { if (!s.destination) { return s.user.id } }));

          $scope.destinations = _.filter(destinations, function(d) { return !_.contains(subscribedDestinations, d.id); });

          if (!_.contains(subscribedUsers, currentUser.id)) {
            $scope.destinations.unshift({user: {name: currentUser.name}});
          }

          $scope.newSubscription.destination = $scope.destinations[0];
          $scope.subscribers = subscribers;
        });

        $scope.destinationsDisplay = function(destination) {
          if (!destination) {
            return '';
          }

          if (destination.destination) {
            destination = destination.destination;
          } else if (destination.user) {
            destination = {
              name: destination.user.name + ' (Email)',
              icon: 'fa-envelope',
              type: 'user'
            };
          }

          return $sce.trustAsHtml('<i class="fa ' + destination.icon + '"></i>&nbsp;' + destination.name);
        };

        $scope.saveSubscriber = function() {
          var sub = new AlertSubscription({alert_id: $scope.alertId});
          if ($scope.newSubscription.destination.id) {
            sub.destination_id = $scope.newSubscription.destination.id;
          }

          sub.$save(function () {
            growl.addSuccessMessage("Subscribed.");
            $scope.subscribers.push(sub);
            $scope.destinations = _.without($scope.destinations, $scope.newSubscription.destination);
            if ($scope.destinations.length > 0) {
              $scope.newSubscription.destination = $scope.destinations[0];
            } else {
              $scope.newSubscription.destination = undefined;
            }
            console.log("dests: ", $scope.destinations);
          }, function (response) {
            growl.addErrorMessage("Failed saving subscription.");
          });
        };

        $scope.unsubscribe = function(subscriber) {
          var destination = subscriber.destination;
          var user = subscriber.user;

          subscriber.$delete(function () {
            growl.addSuccessMessage("Unsubscribed");
            $scope.subscribers = _.without($scope.subscribers, subscriber);
            if (destination) {
              $scope.destinations.push(destination);
            } else if (user.id == currentUser.id) {
              $scope.destinations.push({user: {name: currentUser.name}});
            }

            if ($scope.destinations.length == 1) {
              $scope.newSubscription.destination = $scope.destinations[0];
            }

          }, function () {
            growl.addErrorMessage("Failed unsubscribing.");
          });
        };
      }
    }
  }]);

  angular.module('redash.controllers')
    .controller('AlertsCtrl', ['$scope', 'Events', 'Alert', AlertsCtrl])
    .controller('AlertCtrl', ['$scope', '$routeParams', '$location', 'growl', 'Query', 'Events', 'Alert', 'Destination', AlertCtrl])

})();
