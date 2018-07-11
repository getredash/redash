import { filter } from 'lodash';
import settingsMenu from '@/lib/settings-menu';
import { Paginator } from '@/lib/pagination';
import template from './list.html';

function UsersCtrl(currentUser, Policy, Events, User) {
  Events.record('view', 'page', 'users');

  this.currentUser = currentUser;
  this.policy = Policy;
  this.users = new Paginator([], { itemsPerPage: 20 });

  this.userCategories = {
    all: [],
    enabled: [],
    disabled: [],
  };

  const updateUsers = (users) => {
    this.userCategories.all = users;
    this.userCategories.enabled = filter(users, user => !user.is_disabled);
    this.userCategories.disabled = filter(users, user => user.is_disabled);
    this.setUsersCategory(this.usersCategory);
  };

  this.usersCategory = null;
  this.setUsersCategory = (usersCategory) => {
    this.usersCategory = usersCategory;
    this.users.updateRows(this.userCategories[usersCategory]);
  };
  this.setUsersCategory('enabled');

  this.enableUser = (user) => {
    User.enableUser(user).then(() => {
      updateUsers(this.userCategories.all);
    });
  };

  this.disableUser = (user) => {
    User.disableUser(user).then(() => {
      updateUsers(this.userCategories.all);
    });
  };

  User.query(updateUsers);
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
    },
  };
}
