function Group($resource) {
  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    query: { method: 'GET', cache: false, isArray: true },
    members: {
      method: 'GET', cache: false, isArray: true, url: 'api/groups/:id/members',
    },
    dataSources: {
      method: 'GET', cache: false, isArray: true, url: 'api/groups/:id/data_sources',
    },
  };
  const resource = $resource('api/groups/:id', { id: '@id' }, actions);
  return resource;
}

export default function init(ngModule) {
  ngModule.factory('Group', Group);
}

init.init = true;

