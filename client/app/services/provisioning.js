import _ from "lodash";
import { axios } from "@/services/axios";
import ProvisioningGridOptions from "@/config/dashboard-grid-options";
import Widget from "./widget";
import location from "@/services/location";
import { cloneParameter } from "@/services/parameters";
import { policy } from "@/services/policy";


const provisoningService = {
  getRequest: async (url, data) => {
    try {
      const response = await axios.get(url, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
export default provisoningService;


