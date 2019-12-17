export const IMG_ROOT = "/static/images/destinations";

export let Destination = null; // eslint-disable-line import/no-mutable-exports

function DestinationService($resource) {
  const actions = {
    get: { method: "GET", cache: false, isArray: false },
    types: {
      method: "GET",
      cache: false,
      isArray: true,
      url: "api/destinations/types",
    },
    query: { method: "GET", cache: false, isArray: true },
  };

  return $resource("api/destinations/:id", { id: "@id" }, actions);
}

export default function init(ngModule) {
  ngModule.factory("Destination", DestinationService);

  ngModule.run($injector => {
    Destination = $injector.get("Destination");
  });
}

init.init = true;
