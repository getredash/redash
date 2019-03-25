import { has } from "lodash";
import { axios } from "@/services/axios";
import { fetchDataFromJob } from "@/services/query-result";

export const SCHEMA_NOT_SUPPORTED = 1;
export const SCHEMA_LOAD_ERROR = 2;
export const IMG_ROOT = "/static/images/db-logos";

const DataSource = {
  query: () => axios.get("api/data_sources"),
  get: ({ id }) => axios.get(`api/data_sources/${id}`),
  post: ({ id }) => axios.post(`api/data_sources/${id}`),
  types: () => axios.get("api/data_sources/types"),
  create: data => axios.post(`api/data_sources`, data),
  save: data => axios.post(`api/data_sources/${data.id}`, data),
  test: data => axios.post(`api/data_sources/${data.id}/test`),
  delete: ({ id }) => axios.delete(`api/data_sources/${id}`),
  updateSchema: ({ id, data }) => axios.post(`api/data_sources/${id}/schema`, data),
  fetchSchema: (data, refresh = false) => {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }

    return axios.get(`api/data_sources/${data.id}/schema`, { params }).then(data => {
      if (has(data, "job")) {
        return fetchDataFromJob(data.job.id).catch(error =>
          error.code === SCHEMA_NOT_SUPPORTED ? [] : Promise.reject(new Error(data.job.error))
        );
      }
      return has(data, "schema") ? data.schema : Promise.reject();
    });
  },
};

export default DataSource;
