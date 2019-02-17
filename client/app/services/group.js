export let Group = null; // eslint-disable-line import/no-mutable-exports

function GroupService($resource) {
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
  return $resource('api/groups/:id', { id: '@id' }, actions);
}

export default function init(ngModule) {
  ngModule.factory('Group', GroupService);

  ngModule.run(($injector) => {
    Group = $injector.get('Group');
  });
}

init.init = true;
