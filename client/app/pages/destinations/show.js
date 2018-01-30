import debug from 'debug';
import { findWhere } from 'underscore';
import template from './show.html';

const logger = debug('redash:http');

function DestinationCtrl(
  $scope, $route, $routeParams, $http, $location, toastr,
  currentUser, Events, Destination,
) {
  Events.record('view', 'page', 'admin/destination');

  $scope.destination = $route.current.locals.destination;
  $scope.destinationId = $routeParams.destinationId;
  $scope.types = $route.current.locals.types;
  $scope.type = findWhere($scope.types, { type: $scope.destination.type });
  $scope.canChangeType = $scope.destination.id === undefined;

  $scope.$watch('destination.id', (id) => {
    if (id !== $scope.destinationId && id !== undefined) {
      $location.path(`/destinations/${id}`).replace();
    }
  });

  $scope.setType = (type) => {
    $scope.type = type;
    $scope.destination.type = type.type;
  };

  $scope.resetType = () => {
    $scope.type = undefined;
    $scope.destination = new Destination({ options: {} });
  };

  $scope.delete = () => {
    Events.record('delete', 'destination', $scope.destination.id);

    $scope.destination.$delete(() => {
      toastr.success('Destination deleted successfully.');
      $location.path('/destinations/');
    }, (httpResponse) => {
      logger('Failed to delete destination: ', httpResponse.status, httpResponse.statusText, httpResponse.data);
      toastr.error('Failed to delete destination.');
    });
  };
}

export default function init(ngModule) {
  ngModule.controller('DestinationCtrl', DestinationCtrl);

  return {
    '/destinations/new': {
      template,
      controller: 'DestinationCtrl',
      title: 'Destinations',
      resolve: {
        destination: (Destination) => {
          'ngInject';

          return new Destination({ options: {} });
        },
        types: ($http) => {
          'ngInject';

          return $http.get('api/destinations/types').then(response => response.data);
        },
      },
    },
    '/destinations/:destinationId': {
      template,
      controller: 'DestinationCtrl',
      title: 'Destinations',
      resolve: {
        destination: (Destination, $route) => {
          'ngInject';

          return Destination.get({ id: $route.current.params.destinationId }).$promise;
        },
        types: ($http) => {
          'ngInject';

          return $http.get('api/destinations/types').then(response => response.data);
        },
      },
    },
  };
}
