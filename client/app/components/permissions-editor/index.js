import { contains, each } from 'underscore';
import template from './permissions-editor.html';

const PermissionsEditorComponent = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($http, User) {
    'ngInject';

    this.grantees = [];
    this.newGrantees = {};
    this.aclUrl = this.resolve.aclUrl.url;

    // List users that are granted permissions
    const loadGrantees = () => {
      $http.get(this.aclUrl).success((result) => {
        this.grantees = [];

        each(result, (grantees, accessType) => {
          grantees.forEach((grantee) => {
            grantee.access_type = accessType;
            this.grantees.push(grantee);
          });
        });
      });
    };

    loadGrantees();

    // Search for user
    this.findUser = (search) => {
      if (search === '') {
        return;
      }

      if (this.foundUsers === undefined) {
        User.query((users) => {
          const existingIds = this.grantees.map(m => m.id);
          users.forEach((user) => { user.alreadyGrantee = contains(existingIds, user.id); });
          this.foundUsers = users;
        });
      }
    };

    // Add new user to grantees list
    this.addGrantee = (user) => {
      this.newGrantees.selected = undefined;
      const body = { access_type: 'modify', user_id: user.id };
      $http.post(this.aclUrl, body).success(() => {
        user.alreadyGrantee = true;
        loadGrantees();
      });
    };

    // Remove user from grantees list
    this.removeGrantee = (user) => {
      const body = { access_type: 'modify', user_id: user.id };
      $http({
        url: this.aclUrl,
        method: 'DELETE',
        data: body,
        headers: { 'Content-Type': 'application/json' },
      }).success(() => {
        this.grantees = this.grantees.filter(m => m !== user);

        if (this.foundUsers) {
          this.foundUsers.forEach((u) => { if (u.id === user.id) { u.alreadyGrantee = false; } });
        }
      });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('permissionsEditor', PermissionsEditorComponent);
}
