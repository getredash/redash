import { includes, without, compact } from 'lodash';
import notification from '@/services/notification';
import template from './alert-subscriptions.html';

function controller($scope, $q, $sce, currentUser, AlertSubscription, Destination) {
  'ngInject';

  $scope.newSubscription = {};
  $scope.subscribers = [];
  $scope.destinations = [];
  $scope.currentUser = currentUser;

  $q
    .all([
      Destination.query().$promise,
      AlertSubscription.query({ alertId: $scope.alertId }).$promise,
    ])
    .then((responses) => {
      const destinations = responses[0];
      const subscribers = responses[1];

      const mapF = s => s.destination && s.destination.id;
      const subscribedDestinations = compact(subscribers.map(mapF));

      const subscribedUsers = compact(subscribers.map(s => !s.destination && s.user.id));

      $scope.destinations = destinations.filter(d => !includes(subscribedDestinations, d.id));

      if (!includes(subscribedUsers, currentUser.id)) {
        $scope.destinations.unshift({ user: { name: currentUser.name } });
      }

      $scope.newSubscription.destination = $scope.destinations[0];
      $scope.subscribers = subscribers;
    });

  $scope.destinationsDisplay = (d) => {
    if (!d) {
      return '';
    }

    let destination = d;
    if (d.destination) {
      destination = destination.destination;
    } else if (destination.user) {
      destination = {
        name: `${d.user.name} (Email)`,
        icon: 'fa-envelope',
        type: 'user',
      };
    }

    return $sce.trustAsHtml(`<i class="fa ${destination.icon}"></i>&nbsp;${destination.name}`);
  };

  $scope.saveSubscriber = () => {
    const sub = new AlertSubscription({ alert_id: $scope.alertId });
    if ($scope.newSubscription.destination.id) {
      sub.destination_id = $scope.newSubscription.destination.id;
    }

    sub.$save(
      () => {
        notification.success('Subscribed.');
        $scope.subscribers.push(sub);
        $scope.destinations = without($scope.destinations, $scope.newSubscription.destination);
        if ($scope.destinations.length > 0) {
          $scope.newSubscription.destination = $scope.destinations[0];
        } else {
          $scope.newSubscription.destination = undefined;
        }
      },
      () => {
        notification.error('Failed saving subscription.');
      },
    );
  };

  $scope.unsubscribe = (subscriber) => {
    const destination = subscriber.destination;
    const user = subscriber.user;

    subscriber.$delete(
      () => {
        notification.success('Unsubscribed');
        $scope.subscribers = without($scope.subscribers, subscriber);
        if (destination) {
          $scope.destinations.push(destination);
        } else if (user.id === currentUser.id) {
          $scope.destinations.push({ user: { name: currentUser.name } });
        }

        if ($scope.destinations.length === 1) {
          $scope.newSubscription.destination = $scope.destinations[0];
        }
      },
      () => {
        notification.error('Failed unsubscribing.');
      },
    );
  };
}

export default function init(ngModule) {
  ngModule.directive('alertSubscriptions', () => ({
    restrict: 'E',
    replace: true,
    scope: {
      alertId: '=',
    },
    template,
    controller,
  }));
}

init.init = true;
