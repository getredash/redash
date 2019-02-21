export let Destination = null; // eslint-disable-line import/no-mutable-exports

const IMG_ROOT = '/static/images/destinations';

function DestinationService($resource) {
  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    types: {
      method: 'GET',
      cache: false,
      isArray: true,
      url: 'api/destinations/types',
    },
    query: { method: 'GET', cache: false, isArray: true },
  };

  const DestinationResource = $resource('api/destinations/:id', { id: '@id' }, actions);

  DestinationResource.IMG_ROOT = IMG_ROOT;

  return DestinationResource;
}

export default function init(ngModule) {
  ngModule.factory('Destination', DestinationService);

  ngModule.run(($injector) => {
    Destination = $injector.get('Destination');
  });
}

init.init = true;
