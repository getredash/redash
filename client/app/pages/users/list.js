import { extend } from 'lodash';
import ListCtrl from '@/lib/list-ctrl';
import settingsMenu from '@/lib/settings-menu';
import template from './list.html';

class UsersListCtrl extends ListCtrl {
  constructor($scope, $location, currentUser, clientConfig, Policy, User) {
    super($scope, $location, currentUser, clientConfig);
    this.policy = Policy;
    this.enableUser = user => User.enableUser(user).then(this.update);
    this.disableUser = user => User.disableUser(user).then(this.update);
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
    isActive: $location => $location.path().startsWith('/users') && $location.path() !== '/users/me',
    order: 2,
  });

  ngModule.component('usersListPage', {
    controller: UsersListCtrl,
    template,
  });

  const route = {
    template: '<users-list-page></users-list-page>',
    reloadOnSearch: false,
  };

  return {
    '/users': extend(
      {
        title: 'Users',
        resolve: {
          currentPage: () => 'all',
          resource(User) {
            'ngInject';

            return User.query.bind(User);
          },
        },
      },
      route,
    ),
    '/users/disabled': extend(
      {
        resolve: {
          currentPage: () => 'disabled',
          resource(User) {
            'ngInject';

            return User.query.bind(User);
          },
        },
        title: 'Disabled Users',
      },
      route,
    ),
  };
}

init.init = true;

