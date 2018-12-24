import settingsMenu from '@/lib/settings-menu';
import template from './list.html';

function DestinationsCtrl($scope, $location, toastr, currentUser, Destination) {
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

