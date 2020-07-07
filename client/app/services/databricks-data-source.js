import { has } from "lodash";
import { axios } from "@/services/axios";
import DataSource from "@/services/data-source";
import { fetchDataFromJob } from "@/services/query-result";

export default {
  ...DataSource,
  getDatabases: ({ id }, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios
      .get(`api/databricks/databases/${id}`, { params })
      .then(data => (has(data, "job.id") ? fetchDataFromJob(data.job.id, 300).catch(() => []) : data));
  },
  getDatabaseTables: (data, databaseName, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios
      .get(`api/databricks/databases/${data.id}/${databaseName}/tables`, { params })
      .then(data => (has(data, "job.id") ? fetchDataFromJob(data.job.id, 300).catch(() => []) : data));
  },
};
