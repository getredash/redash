import { merge } from "lodash";

export let Alert = null; // eslint-disable-line import/no-mutable-exports

// backwards compatibility
const normalizeCondition = {
  "greater than": ">",
  "less than": "<",
  equals: "=",
};

function AlertService($resource, $http) {
  const actions = {
    get: {
      method: "GET",
      transformResponse: $http.defaults.transformResponse.concat([
        data =>
          merge({}, data, {
            options: {
              op: normalizeCondition[data.options.op] || data.options.op,
            },
          }),
      ]),
    },
    save: {
      method: "POST",
      transformRequest: [
        data => {
          const newData = Object.assign({}, data);
          if (newData.query_id === undefined) {
            newData.query_id = newData.query.id;
            newData.destination_id = newData.destinations;
            delete newData.query;
            delete newData.destinations;
          }

          return newData;
        },
      ].concat($http.defaults.transformRequest),
    },
    mute: { method: "POST", url: "api/alerts/:id/mute" },
    unmute: { method: "DELETE", url: "api/alerts/:id/mute" },
  };
  return $resource("api/alerts/:id", { id: "@id" }, actions);
}

export default function init(ngModule) {
  ngModule.factory("Alert", AlertService);

  ngModule.run($injector => {
    Alert = $injector.get("Alert");
  });
}

init.init = true;
