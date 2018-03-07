import { isArray, isString } from 'underscore';

function transformSingle(user) {
  if (user.groups !== undefined) {
    user.admin = user.groups.indexOf('admin') !== -1;
  }
}

function transform(data) {
  if (isArray(data)) {
    data.forEach(transformSingle);
  } else {
    transformSingle(data);
  }

  return data;
}

function enableUser(user, toastr) {
  return user.$enable()
    .then((data) => {
      toastr.success(
        `User <b>${user.name}</b> is now enabled.`,
        { allowHtml: true },
      );
      return data;
    })
    .catch((response) => {
      let message = response instanceof Error ? response.message : response.statusText;
      if (!isString(message)) {
        message = 'Unknown error';
      }
      toastr.error(
        `Cannot enable user <b>${user.name}</b><br>${message}`,
        { allowHtml: true },
      );
    });
}

function disableUser(user, toastr) {
  return user.$disable()
    .then((data) => {
      toastr.warning(
        `User <b>${user.name}</b> is now disabled.`,
        { allowHtml: true },
      );
      return data;
    })
    .catch((response) => {
      let message = response instanceof Error ? response.message : response.statusText;
      if (!isString(message)) {
        message = 'Unknown error';
      }
      toastr.error(
        `Cannot disable user <b>${user.name}</b><br>${message}`,
        { allowHtml: true },
      );
    });
}

function User($resource, $http, toastr) {
  const transformResponse = $http.defaults.transformResponse.concat(transform);

  const actions = {
    get: { method: 'GET', transformResponse },
    save: { method: 'POST', transformResponse },
    query: { method: 'GET', isArray: true, transformResponse },
    delete: { method: 'DELETE', transformResponse },
    disable: { method: 'POST', url: 'api/users/:id/disable', transformResponse },
    enable: { method: 'DELETE', url: 'api/users/:id/disable', transformResponse },
  };

  const UserResource = $resource('api/users/:id', { id: '@id' }, actions);

  UserResource.enableUser = user => enableUser(user, toastr);
  UserResource.disableUser = user => disableUser(user, toastr);

  return UserResource;
}

export default function init(ngModule) {
  ngModule.factory('User', User);
}
