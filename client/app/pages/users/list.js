import { policy } from '@/services/policy';
import { buildListRoutes, ListCtrl } from '@/lib/list-ctrl';
import settingsMenu from '@/services/settingsMenu';
import template from './list.html';


class UsersListCtrl extends ListCtrl {
  constructor($scope, $location, $route, currentUser, clientConfig, User) {
    super($scope, $location, $route, currentUser, clientConfig);
    this.policy = policy;
    this.enableUser = user => User.enableUser(user).then(this.update);
    this.disableUser = user => User.disableUser(user).then(this.update);
    this.deleteUser = user => User.deleteUser(user).then(this.update);
  }

  getRequest(requestedPage, itemsPerPage, orderByField) {
    const request = super.getRequest(requestedPage, itemsPerPage, orderByField);
    if (this.currentPage === 'disabled') {
      request.disabled = true;
    }
    return request;
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results;
    this.paginator.updateRows(rows, data.count);
    this.showEmptyState = data.count === 0;
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'list_users',
    title: 'Users',
    path: 'users',
    isActive: path => path.startsWith('/users') && (path !== '/users/me'),
    order: 2,
  });

  ngModule.component('usersListPage', {
    controller: UsersListCtrl,
    template,
  });

  const routes = [
    {
      page: 'all',
      title: 'All Users',
      path: '/users',
    },
    {
      page: 'disabled',
      title: 'Disabled Users',
      path: '/users/disabled',
    },
  ];

  return buildListRoutes('user', routes, '<users-list-page></users-list-page>');
}

init.init = true;
