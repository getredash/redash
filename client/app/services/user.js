import { isString } from 'lodash';

function enableUser(user, toastr, $sanitize) {
  const userName = $sanitize(user.name);
  return user
    .$enable()
    .then((data) => {
      toastr.success(`User <b>${userName}</b> is now enabled.`, { allowHtml: true });
      return data;
    })
    .catch((response) => {
      let message = response instanceof Error ? response.message : response.statusText;
      if (!isString(message)) {
        message = 'Unknown error';
      }
      toastr.error(`Cannot enable user <b>${userName}</b><br>${message}`, { allowHtml: true });
    });
}

function disableUser(user, toastr, $sanitize) {
  const userName = $sanitize(user.name);
  return user
    .$disable()
    .then((data) => {
      toastr.warning(`User <b>${userName}</b> is now disabled.`, { allowHtml: true });
      return data;
    })
    .catch((response) => {
      let message = response instanceof Error ? response.message : response.statusText;
      if (!isString(message)) {
        message = 'Unknown error';
      }
      toastr.error(`Cannot disable user <b>${userName}</b><br>${message}`, { allowHtml: true });
    });
}

function User($resource, $http, $sanitize, toastr) {
  const actions = {
    get: { method: 'GET' },
    save: { method: 'POST' },
    query: { method: 'GET', isArray: false },
    delete: { method: 'DELETE' },
    disable: { method: 'POST', url: 'api/users/:id/disable' },
    enable: { method: 'DELETE', url: 'api/users/:id/disable' },
  };

  const UserResource = $resource('api/users/:id', { id: '@id' }, actions);

  UserResource.enableUser = user => enableUser(user, toastr, $sanitize);
  UserResource.disableUser = user => disableUser(user, toastr, $sanitize);

  return UserResource;
}

export default function init(ngModule) {
  ngModule.factory('User', User);
}
