import settingsMenu from '@/lib/settings-menu';
import { Paginator } from '@/lib/pagination';
import template from './list.html';

function GroupsCtrl($scope, $uibModal, currentUser, Events, Group) {
  Events.record('view', 'page', 'groups');
  $scope.currentUser = currentUser;
  $scope.groups = new Paginator([], { itemsPerPage: 20 });
  Group.query((groups) => {
    $scope.groups.updateRows(groups);
  });

  $scope.newGroup = () => {
    $uibModal.open({
      component: 'editGroupDialog',
      size: 'sm',
      resolve: {
        group() {
          return new Group({});
        },
      },
    });
  };
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'list_users',
    title: 'Groups',
    path: 'groups',
    order: 3,
  });

  ngModule.controller('GroupsCtrl', GroupsCtrl);

  return {
    '/groups': {
      template,
      controller: 'GroupsCtrl',
      title: 'Groups',
    },
  };
}
