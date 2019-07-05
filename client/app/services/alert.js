export let Alert = null; // eslint-disable-line import/no-mutable-exports

function AlertService($resource, $http) {
  const actions = {
    save: {
      method: 'POST',
      transformRequest: [(data) => {
        const newData = Object.assign({}, data);
        if (newData.query_id === undefined) {
          newData.query_id = newData.query.id;
          newData.destination_id = newData.destinations;
          delete newData.query;
          delete newData.destinations;
        }

        return newData;
      }].concat($http.defaults.transformRequest),
    },
  };
  return $resource('api/alerts/:id', { id: '@id' }, actions);
}

export default function init(ngModule) {
  ngModule.factory('Alert', AlertService);

  ngModule.run(($injector) => {
    Alert = $injector.get('Alert');
  });
}

init.init = true;
