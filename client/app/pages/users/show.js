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

  $scope.canEdit = currentUser.hasPermission('admin') || currentUser.id === parseInt($scope.userId, 10);
  $scope.showSettings = false;
  $scope.showPasswordSettings = false;

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
    if (user.auth_type === 'password') {
      $scope.showSettings = $scope.canEdit;
      $scope.showPasswordSettings = $scope.canEdit;
    }

    $scope.userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profile_image_url,
      apiKey: user.api_key,
      isDisabled: user.is_disabled,
    };
  });

  $scope.resendInvitation = () => {
    $http.post(`api/users/${$scope.user.id}/invite`).success(() => {
      toastr.success('Invitation sent.', {
        timeOut: 10000,
      });
    });
  };

  $scope.enableUser = (user) => {
    User.enableUser(user);
  };
  $scope.disableUser = (user) => {
    User.disableUser(user);
  };
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
