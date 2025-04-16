import { has } from "lodash";
import { axios } from "@/services/axios";
import DataSource from "@/services/data-source";
import { fetchDataFromJob } from "@/services/query-result";

function fetchDataFromJobOrReturnData(data) {
  return has(data, "job.id") ? fetchDataFromJob(data.job.id, 1000) : data;
}

function rejectErrorResponse(data) {
  return has(data, "error") ? Promise.reject(new Error(data.error.message)) : data;
}

export default {
  ...DataSource,
  getDatabases: ({ id }, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios
      .get(`api/databricks/databases/${id}`, { params })
      .then(fetchDataFromJobOrReturnData)
      .then(rejectErrorResponse);
  },
  getDatabaseTables: (data, databaseName, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios
      .get(`api/databricks/databases/${data.id}/${databaseName}/tables`, { params })
      .then(fetchDataFromJobOrReturnData)
      .then(rejectErrorResponse);
  },
  getTableColumns: (data, databaseName, tableName) =>
    axios
      .get(`api/databricks/databases/${data.id}/${databaseName}/columns/${tableName}`)
      .then(fetchDataFromJobOrReturnData)
      .then(rejectErrorResponse),
};
