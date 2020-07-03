import { has } from "lodash";
import { axios } from "@/services/axios";
import DataSource from "@/services/data-source";
import { fetchDataFromJob } from "@/services/query-result";

export default {
  ...DataSource,
  getDatabases: ({ id }) =>
    axios
      .get(`api/databricks/databases/${id}`)
      .then(data => (has(data, "job.id") ? fetchDataFromJob(data.job.id, 300).catch(() => []) : Promise.resolve([]))),
  getDatabaseTables: (data, databaseName) =>
    axios
      .get(`api/databricks/databases/${data.id}/${databaseName}/tables`)
      .then(data => (has(data, "job.id") ? fetchDataFromJob(data.job.id, 300).catch(() => []) : Promise.resolve([]))),
};
