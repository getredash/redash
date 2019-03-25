import settingsMenu from '@/services/settingsMenu';
import template from './list.html';

function DestinationsCtrl($scope, $location, currentUser, Destination) {
  $scope.destinations = Destination.query();
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'admin',
    title: 'Alert Destinations',
    path: 'destinations',
    order: 4,
  });

  ngModule.controller('DestinationsCtrl', DestinationsCtrl);

  return {
    '/destinations': {
      template,
      controller: 'DestinationsCtrl',
      title: 'Destinations',
    },
  };
}

init.init = true;
