export const SCHEMA_NOT_SUPPORTED = 1;
export const SCHEMA_LOAD_ERROR = 2;
export const IMG_ROOT = "/static/images/db-logos";

export let DataSource = null; // eslint-disable-line import/no-mutable-exports

function DataSourceService($q, $resource, $http) {
  function fetchSchema(dataSourceId, refresh = false) {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }

    return $http.get(`api/data_sources/${dataSourceId}/schema`, { params });
  }

  const actions = {
    get: { method: "GET", cache: false, isArray: false },
    query: { method: "GET", cache: false, isArray: true },
    save: { method: "POST" },
    types: {
      method: "GET",
      cache: false,
      isArray: true,
      url: "api/data_sources/types",
    },
    test: {
      method: "POST",
      cache: false,
      isArray: false,
      url: "api/data_sources/:id/test",
    },
  };

  const DataSourceResource = $resource("api/data_sources/:id", { id: "@id" }, actions);

  DataSourceResource.prototype.getSchema = function getSchema(refresh = false) {
    if (this._schema === undefined || refresh) {
      return fetchSchema(this.id, refresh).then(response => {
        const data = response.data;

        this._schema = data;

        return data;
      });
    }

    return $q.resolve(this._schema);
  };

  return DataSourceResource;
}

export default function init(ngModule) {
  ngModule.factory("DataSource", DataSourceService);

  ngModule.run($injector => {
    DataSource = $injector.get("DataSource");
  });
}

init.init = true;
