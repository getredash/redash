import { each } from 'lodash';
import settingsMenu from '@/services/settingsMenu';
import template from './show.html';
import './settings.less';

function UserCtrl(
  $scope, $routeParams, $http, $location, toastr,
  currentUser, User,
) {
  $scope.userId = $routeParams.userId;
  $scope.currentUser = currentUser;

  if ($scope.userId === undefined) {
    $scope.userId = currentUser.id;
  }

  $scope.selectTab = (tab) => {
    $scope.selectedTab = tab;
    each($scope.tabs, (v, k) => {
      $scope.tabs[k] = (k === tab);
    });
  };

  $scope.setTab = (tab) => {
    $scope.selectedTab = tab;
    $location.hash(tab);
  };

  $scope.tabs = {
    profile: false,
    apiKey: false,
    settings: false,
    password: false,
  };

  $scope.selectTab($location.hash() || 'profile');

  $scope.user = User.get({ id: $scope.userId }, (user) => {
    $scope.userInfo = User.convertUserInfo(user);
  });
}

export default function init(ngModule) {
  settingsMenu.add({
    title: 'Account',
    path: 'users/me',
    order: 7,
  });

  ngModule.controller('UserCtrl', UserCtrl);

  return {
    '/users/me': {
      template,
      reloadOnSearch: false,
      controller: 'UserCtrl',
      title: 'Account',
    },
    '/users/:userId': {
      template,
      reloadOnSearch: false,
      controller: 'UserCtrl',
      title: 'Users',
    },
  };
}

init.init = true;
