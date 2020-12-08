import { has, map, isObject } from "lodash";
import { axios } from "@/services/axios";
import { fetchDataFromJob } from "@/services/query-result";

export const SCHEMA_NOT_SUPPORTED = 1;
export const SCHEMA_LOAD_ERROR = 2;
export const IMG_ROOT = "static/images/db-logos";

function mapSchemaColumnsToObject(columns: any) {
  return map(columns, column => (isObject(column) ? column : { name: column }));
}

const DataSource = {
  query: () => axios.get("api/data_sources"),
  get: ({
    id
  }: any) => axios.get(`api/data_sources/${id}`),
  types: () => axios.get("api/data_sources/types"),
  create: (data: any) => axios.post(`api/data_sources`, data),
  save: (data: any) => axios.post(`api/data_sources/${data.id}`, data),
  test: (data: any) => axios.post(`api/data_sources/${data.id}/test`),
  delete: ({
    id
  }: any) => axios.delete(`api/data_sources/${id}`),
  fetchSchema: (data: any, refresh = false) => {
    const params = {};

    if (refresh) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'refresh' does not exist on type '{}'.
      params.refresh = true;
    }

    return axios
      .get(`api/data_sources/${data.id}/schema`, { params })
      .then(data => {
        if (has(data, "job")) {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'job' does not exist on type 'AxiosRespon... Remove this comment to see the full error message
          return fetchDataFromJob(data.job.id).catch((error: any) => error.code === SCHEMA_NOT_SUPPORTED ? [] : Promise.reject(new Error(data.job.error))
          );
        }
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'schema' does not exist on type 'AxiosRes... Remove this comment to see the full error message
        return has(data, "schema") ? data.schema : Promise.reject();
      })
      .then(tables => map(tables, table => ({ ...table, columns: mapSchemaColumnsToObject(table.columns) })));
  },
};

export default DataSource;
