import { find } from 'lodash';
import template from './show.html';
import { deleteConfirm, logAndToastrError, toastrSuccessAndPath } from '../data-sources/show';

function DestinationCtrl(
  $scope, $route, $routeParams, $http, $location, toastr,
  currentUser, AlertDialog, Destination,
) {
  $scope.destination = $route.current.locals.destination;
  $scope.destinationId = $routeParams.destinationId;
  $scope.types = $route.current.locals.types;
  $scope.type = find($scope.types, { type: $scope.destination.type });
  $scope.canChangeType = $scope.destination.id === undefined;

  function deleteDestination(callback) {
    const doDelete = () => {
      $scope.destination.$delete(() => {
        toastrSuccessAndPath('Destination', 'destinations', toastr, $location);
      }, (httpResponse) => {
        logAndToastrError('destination', httpResponse, toastr);
      });
    };

    const title = 'Delete Destination';
    const message = `Are you sure you want to delete the "${$scope.destination.name}" destination?`;

    AlertDialog.open(title, message, deleteConfirm).then(doDelete, callback);
  }

  $scope.actions = [
    { name: 'Delete', type: 'danger', callback: deleteDestination },
  ];
}

export default function init(ngModule) {
  ngModule.controller('DestinationCtrl', DestinationCtrl);

  return {
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

init.init = true;
