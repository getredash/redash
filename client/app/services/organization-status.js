function OrganizationStatus($http) {
  this.objectCounters = {};

  this.refresh = () =>
    $http.get('api/organization/status').then(({ data }) => {
      this.objectCounters = data.object_counters;
      return this;
    });
}

export default function init(ngModule) {
  ngModule.service('OrganizationStatus', OrganizationStatus);
}

init.init = true;

