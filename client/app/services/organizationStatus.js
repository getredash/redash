import { axios } from "@/services/axios";

class OrganizationStatus {
  constructor() {
    this.objectCounters = {};
  }

  refresh() {
    return axios.get("api/organization/status").then(data => {
      this.objectCounters = data.object_counters;
      return this;
    });
  }
}

export default new OrganizationStatus();
