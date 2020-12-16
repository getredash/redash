import { axios } from "@/services/axios";

class OrganizationStatus {
  objectCounters: any;
  constructor() {
    this.objectCounters = {};
  }

  refresh() {
    return axios.get("api/organization/status").then(data => {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'object_counters' does not exist on type ... Remove this comment to see the full error message
      this.objectCounters = data.object_counters;
      return this;
    });
  }
}

export default new OrganizationStatus();
