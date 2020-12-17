import { axios } from "@/services/axios";
class OrganizationStatus {
    objectCounters: any;
    constructor() {
        this.objectCounters = {};
    }
    refresh() {
        return axios.get("api/organization/status").then(data => {
            this.objectCounters = (data as any).object_counters;
            return this;
        });
    }
}
export default new OrganizationStatus();
