import { includes, each } from 'lodash';
import template from './permissions-editor.html';

const PermissionsEditorComponent = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($http, User, clientConfig) {
    'ngInject';

    this.grantees = [];
    this.newGrantees = {};
    this.aclUrl = this.resolve.aclUrl.url;
    this.showViewPermission = clientConfig.showViewPermission;
    this.foundUsers = {};

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
    this.findUser = (search, accessType) => {
      if (search === '') {
        return;
      }

      if (this.foundUsers[accessType] === undefined) {
        User.query((users) => {
          const filtered = this.grantees.filter(m => m.access_type === accessType);
          const existingIds = filtered.map(m => m.id);
          users.forEach((user) => { user.alreadyGrantee = includes(existingIds, user.id); });
          this.foundUsers[accessType] = users;
        });
      }
    };


    // Add new user to grantees list
    this.addGrantee = (user, accessType) => {
      this.newGrantees.selected = undefined;
      const body = { access_type: accessType, user_id: user.id };
      $http.post(this.aclUrl, body).success(() => {
        user.alreadyGrantee = true;
        loadGrantees();
      });
    };

    // Remove user from grantees list
    this.removeGrantee = (user) => {
      const body = { access_type: user.access_type, user_id: user.id };
      $http({
        url: this.aclUrl,
        method: 'DELETE',
        data: body,
        headers: { 'Content-Type': 'application/json' },
      }).success(() => {
        this.grantees = this.grantees.filter(m => m !== user);

        if (this.foundUsers[user.access_type]) {
          const users = this.foundUsers[user.access_type];
          users.forEach((u) => { if (u.id === user.id) { u.alreadyGrantee = false; } });
        }
      });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('permissionsEditor', PermissionsEditorComponent);
}
