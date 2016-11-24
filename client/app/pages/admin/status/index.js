import template from './status.html';

// TODO: switch to $ctrl instead of $scope.
function AdminStatusCtrl($scope, $http, $timeout, currentUser, Events) {
  Events.record('view', 'page', 'admin/status');
  // $scope.$parent.pageTitle = 'System Status';

  const refresh = () => {
    $http.get('/status.json').success((data) => {
      $scope.workers = data.workers;
      delete data.workers;
      $scope.manager = data.manager;
      delete data.manager;
      $scope.status = data;
    });

    const timer = $timeout(refresh, 59 * 1000);

    $scope.$on('$destroy', () => {
      if (timer) {
        $timeout.cancel(timer);
      }
    });
  };

  refresh();
}

export default function (ngModule) {
  ngModule.component('statusPage', {
    template,
    controller: AdminStatusCtrl,
  });

  return {
    '/admin/status': {
      template: '<status-page></status-page>',
    },
  };
}
