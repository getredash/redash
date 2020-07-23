import { has } from "lodash";
import { axios } from "@/services/axios";
import DataSource from "@/services/data-source";

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
    return axios.get(`api/databricks/databases/${id}`, { params }).then(rejectErrorResponse);
  },
  getDatabaseTables: (data, databaseName, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }
    return axios
      .get(`api/databricks/databases/${data.id}/${databaseName}/tables`, { params })
      .then(rejectErrorResponse);
  },
  getTableColumns: (data, databaseName, tableName) =>
    axios.get(`api/databricks/databases/${data.id}/${databaseName}/columns/${tableName}`).then(rejectErrorResponse),
};
