export let $http = null; // eslint-disable-line import/no-mutable-exports
export let $sanitize = null; // eslint-disable-line import/no-mutable-exports
export let $location = null; // eslint-disable-line import/no-mutable-exports
export let $route = null; // eslint-disable-line import/no-mutable-exports
export let $routeParams = null; // eslint-disable-line import/no-mutable-exports
export let $q = null; // eslint-disable-line import/no-mutable-exports
export let $rootScope = null; // eslint-disable-line import/no-mutable-exports

export default function init(ngModule) {
  ngModule.run($injector => {
    $http = $injector.get("$http");
    $sanitize = $injector.get("$sanitize");
    $location = $injector.get("$location");
    $route = $injector.get("$route");
    $routeParams = $injector.get("$routeParams");
    $q = $injector.get("$q");
    $rootScope = $injector.get("$rootScope");
  });
}

init.init = true;
