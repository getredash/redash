function DataSource($resource, $http) {
  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    query: { method: 'GET', cache: false, isArray: true },
    test: {
      method: 'POST', cache: false, isArray: false, url: 'api/data_sources/:id/test',
    },
    // getSchema: {
    //   method: 'GET', cache: false, isArray: true, url: 'api/data_sources/:id/schema',
    // },
  };

  const DataSourceResource = $resource('api/data_sources/:id', { id: '@id' }, actions);

  DataSourceResource.prototype.getSchema = function getSchema(refresh = false) {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }

    return $http.get(`api/data_sources/${this.id}/schema`, { params });
  };

  return DataSourceResource;
}


export default function init(ngModule) {
  ngModule.factory('DataSource', DataSource);
}
