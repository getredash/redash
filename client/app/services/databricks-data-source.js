import { axios } from "@/services/axios";
import DataSource from "@/services/data-source";

export default {
  ...DataSource,
  getDatabases: ({ id }, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios.get(`api/databricks/databases/${id}`, { params });
  },
  getDatabaseTables: (data, databaseName, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios.get(`api/databricks/databases/${data.id}/${databaseName}/tables`, { params });
  },
};
