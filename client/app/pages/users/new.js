import { absoluteUrl } from '@/services/utils';
import template from './new.html';

function NewUserCtrl($scope, toastr, currentUser, Events, User) {
  Events.record('view', 'page', 'users/new');

  $scope.inviteLink = '';

  $scope.user = new User({});
  $scope.saveUser = () => {
    if (!this.userForm.$valid) {
      return;
    }

    $scope.user.$save((user) => {
      $scope.user = user;
      $scope.user.created = true;
      $scope.inviteLink = absoluteUrl(user.invite_link);
      toastr.success('Saved.');
    }, (error) => {
      const message = error.data.message || 'Failed saving.';
      toastr.error(message);
    });
  };
}

export default function init(ngModule) {
  ngModule.controller('NewUserCtrl', NewUserCtrl);

  return {
    '/users/new': {
      template,
      controller: 'NewUserCtrl',
      controllerAs: '$ctrl',
      bindToController: 'true',
    },
  };
}

init.init = true;

