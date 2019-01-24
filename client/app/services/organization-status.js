export let OrganizationStatus = null; // eslint-disable-line import/no-mutable-exports

function OrganizationStatusService($http) {
  this.objectCounters = {};

  this.refresh = () =>
    $http.get('api/organization/status').then(({ data }) => {
      this.objectCounters = data.object_counters;
      return this;
    });
}

export default function init(ngModule) {
  ngModule.service('OrganizationStatus', OrganizationStatusService);

  ngModule.run(($injector) => {
    OrganizationStatus = $injector.get('OrganizationStatus');
  });
}

init.init = true;

