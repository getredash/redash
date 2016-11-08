import { each } from 'underscore';
import template from './show.html';

function UserCtrl($scope, $routeParams, $http, $location, toastr, currentUser, Events, User) {
  // $scope.$parent.pageTitle = 'Users';

  $scope.userId = $routeParams.userId;
  $scope.currentUser = currentUser;

  if ($scope.userId === 'me') {
    $scope.userId = currentUser.id;
  }

  Events.record(currentUser, 'view', 'user', $scope.userId);
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
  });

  $scope.password = {
    current: '',
    new: '',
    newRepeat: '',
  };

  $scope.savePassword = (form) => {
    $scope.$broadcast('show-errors-check-validity');

    if (!form.$valid) {
      return;
    }

    const data = {
      id: $scope.user.id,
      password: $scope.password.new,
      old_password: $scope.password.current,
    };

    User.save(data, () => {
      toastr.success('Password Saved.');
      $scope.password = {
        current: '',
        new: '',
        newRepeat: '',
      };
    }, (error) => {
      const message = error.data.message || 'Failed saving password.';
      toastr.error(message);
    });
  };

  $scope.updateUser = (form) => {
    $scope.$broadcast('show-errors-check-validity');

    if (!form.$valid) {
      return;
    }

    const data = {
      id: $scope.user.id,
      name: $scope.user.name,
      email: $scope.user.email,
    };

    User.save(data, (user) => {
      toastr.success('Saved.');
      $scope.user = user;
    }, (error) => {
      const message = error.data.message || 'Failed saving.';
      toastr.error(message);
    });
  };

  $scope.sendPasswordReset = () => {
    $scope.disablePasswordResetButton = true;
    $http.post(`api/users/${$scope.user.id}/reset_password`).success((user) => {
      $scope.disablePasswordResetButton = false;
      toastr.success('The user should receive a link to reset his password by email soon.');
    });
  };
}

export default function (ngModule) {
  ngModule.controller('UserCtrl', UserCtrl);

  return {
    '/users/:userId': {
      template,
      reloadOnSearch: false,
      controller: 'UserCtrl',
    },
  };
}
