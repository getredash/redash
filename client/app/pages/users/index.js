import { extend } from 'lodash';
import { routesToAngularRoutes } from '@/lib/utils';

export default function init() {
  const listRoutes = routesToAngularRoutes([
    {
      path: '/users',
      title: 'Users',
      key: 'active',
    },
    {
      path: '/users/new',
      title: 'Users',
      key: 'active',
      isNewUserPage: true,
    },
    {
      path: '/users/pending',
      title: 'Pending Invitations',
      key: 'pending',
    },
    {
      path: '/users/disabled',
      title: 'Disabled Users',
      key: 'disabled',
    },
  ], {
    template: '<settings-screen><page-users-list on-error="handleError"></page-users-list></settings-screen>',
    reloadOnSearch: false,
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });

  const profileRoutes = routesToAngularRoutes([
    {
      path: '/users/me',
      title: 'Account',
      key: 'users',
    },
    {
      path: '/users/:userId',
      title: 'Users',
      key: 'users',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-user-profile on-error="handleError"></page-user-profile></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });

  return extend(listRoutes, profileRoutes);
}

init.init = true;
