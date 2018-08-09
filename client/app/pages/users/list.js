import { isString } from 'lodash';
import settingsMenu from '@/lib/settings-menu';
import { LivePaginator } from '@/lib/pagination';
import template from './list.html';

function UsersCtrl($location, currentUser, Policy, Events, User) {
  Events.record('view', 'page', 'users');

  this.currentUser = currentUser;
  if ($location.path() === '/users/disabled') {
    this.currentPage = 'disabled_users';
  } else {
    this.currentPage = 'users';
  }
  this.policy = Policy;
  this.term = $location.search().q;

  const fetcher = (requestedPage, itemsPerPage, orderByField, orderByReverse, paginator) => {
    $location.search('page', requestedPage);

    const setSearchOrClear = (name, value) => {
      if (value) {
        $location.search(name, value);
      } else {
        $location.search(name, undefined);
      }
    };

    if (orderByReverse && !orderByField.startsWith('-')) {
      orderByField = '-' + orderByField;
    }
    setSearchOrClear('order', orderByField);

    const request = Object.assign({}, this.defaultOptions, {
      page: requestedPage,
      page_size: itemsPerPage,
      order: orderByField,
    });

    if (isString(this.term) && this.term !== '') {
      request.q = this.term;
    }

    if (this.term === '') {
      this.term = null;
    }

    if (this.currentPage === 'disabled_users') {
      request.disabled = true;
    }

    $location.search('q', this.term);

    this.loaded = false;
    this.notFound = false;

    return User.query(request).$promise.then((data) => {
      this.loaded = true;
      const rows = data.results;

      if (this.term !== null && data.count === 0) {
        this.notFound = true;
      }

      paginator.updateRows(rows, data.count);
    });
  };

  const page = parseInt($location.search().page || 1, 10);
  this.paginator = new LivePaginator(fetcher, { page });

  this.update = () => {
    this.paginator.setPage(page);
  };

  this.search = () => {
    $location.search('page', 1);
    this.paginator.setPage(1);
  };

  this.enableUser = (user) => {
    User.enableUser(user).then(this.update);
  };

  this.disableUser = (user) => {
    User.disableUser(user).then(this.update);
  };
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
    controller: UsersCtrl,
    template,
  });

  return {
    '/users': {
      template: '<users-list-page></users-list-page>',
      title: 'Users',
      reloadOnSearch: false,
    },
    '/users/disabled': {
      template: '<users-list-page></users-list-page>',
      title: 'Users',
      reloadOnSearch: false,
    },
  };
}
