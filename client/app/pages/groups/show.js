import { includes } from 'lodash';
import template from './show.html';

function GroupCtrl($scope, $routeParams, $http, currentUser, Group, User) {
  $scope.currentUser = currentUser;
  $scope.group = Group.get({ id: $routeParams.groupId });
  $scope.members = Group.members({ id: $routeParams.groupId });
  $scope.newMember = {};

  $scope.findUser = (search) => {
    if (search === '') {
      $scope.foundUsers = [];
      return;
    }

    User.query({ q: search }, (response) => {
      const users = response.results;
      const existingIds = $scope.members.map(m => m.id);
      users.forEach((user) => {
        user.alreadyMember = includes(existingIds, user.id);
      });
      $scope.foundUsers = users;
    });
  };

  $scope.addMember = (user) => {
    // Clear selection, to clear up the input control.
    $scope.newMember.selected = undefined;

    $http.post(`api/groups/${$routeParams.groupId}/members`, { user_id: user.id }).success(() => {
      $scope.members.unshift(user);
      user.alreadyMember = true;
    });
  };

  $scope.removeMember = (member) => {
    $http.delete(`api/groups/${$routeParams.groupId}/members/${member.id}`).success(() => {
      $scope.members = $scope.members.filter(m => m !== member);

      if ($scope.foundUsers) {
        $scope.foundUsers.forEach((user) => {
          if (user.id === member.id) {
            user.alreadyMember = false;
          }
        });
      }
    });
  };
}

export default function init(ngModule) {
  ngModule.controller('GroupCtrl', GroupCtrl);
  return {
    '/groups/:groupId': {
      template,
      controller: 'GroupCtrl',
    },
  };
}

init.init = true;
