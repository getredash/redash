import { $http } from "@/services/ng";

class OrganizationStatus {
  constructor() {
    this.objectCounters = {};
  }

  refresh() {
    return $http.get("api/organization/status").then(({ data }) => {
      this.objectCounters = data.object_counters;
      return this;
    });
  }
}

export default new OrganizationStatus();
