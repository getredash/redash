function Destination($resource) {
  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    query: { method: 'GET', cache: false, isArray: true },
  };

  const DestinationResource = $resource('api/destinations/:id', { id: '@id' }, actions);

  return DestinationResource;
}

export default function (ngModule) {
  ngModule.factory('Destination', Destination);
}
