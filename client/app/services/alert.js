function Alert($resource, $http) {
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
  const resource = $resource('api/alerts/:id', { id: '@id' }, actions);

  return resource;
}

export default function init(ngModule) {
  ngModule.factory('Alert', Alert);
}

init.init = true;

