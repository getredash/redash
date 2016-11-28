import { contains } from 'underscore';
import template from './show.html';

function GroupCtrl($scope, $routeParams, $http, $location, toastr,
                   currentUser, Events, Group, User) {
  Events.record('view', 'group', $scope.groupId);

  $scope.currentUser = currentUser;
  $scope.group = Group.get({ id: $routeParams.groupId });
  $scope.members = Group.members({ id: $routeParams.groupId });
  $scope.newMember = {};

  $scope.findUser = (search) => {
    if (search === '') {
      return;
    }

    if ($scope.foundUsers === undefined) {
      User.query((users) => {
        const existingIds = $scope.members.map(m => m.id);
        users.forEach((user) => { user.alreadyMember = contains(existingIds, user.id); });
        $scope.foundUsers = users;
      });
    }
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
          if (user.id === member.id) { user.alreadyMember = false; }
        });
      }
    });
  };
}

export default function (ngModule) {
  ngModule.controller('GroupCtrl', GroupCtrl);
  return {
    '/groups/:groupId': {
      template,
      controller: 'GroupCtrl',
    },
  };
}
