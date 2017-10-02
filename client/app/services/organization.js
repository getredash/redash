function Organization($resource) {
  const actions = {
    query: { method: 'GET', cache: false, isArray: true },
    save: { method: 'POST', cache: false, isArray: false, url: 'api/organizations/:id' },
  };
  return $resource('api/organizations/:id', { id: '@id' }, actions);
}

export default function (ngModule) {
  ngModule.factory('Organization', Organization);
}
