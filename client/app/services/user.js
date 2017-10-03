import { isArray } from 'underscore';

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

function User($resource, $http) {
  const transformResponse = $http.defaults.transformResponse.concat(transform);

  const actions = {
    get: { method: 'GET', transformResponse },
    save: { method: 'POST', transformResponse },
    query: { method: 'GET', isArray: true, transformResponse },
    delete: { method: 'DELETE', transformResponse },
  };

  const UserResource = $resource('api/users/:id', { id: '@id' }, actions);

  return UserResource;
}

export default function init(ngModule) {
  ngModule.factory('User', User);
}
