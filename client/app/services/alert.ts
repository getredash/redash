import { axios } from "@/services/axios";
import { merge } from "lodash";

// backwards compatibility
const normalizeCondition = {
  "greater than": ">",
  "less than": "<",
  equals: "=",
};

const transformResponse = (data: any) => merge({}, data, {
  options: {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    op: normalizeCondition[data.options.op] || data.options.op,
  },
});

const transformRequest = (data: any) => {
  const newData = Object.assign({}, data);
  if (newData.query_id === undefined) {
    newData.query_id = newData.query.id;
    newData.destination_id = newData.destinations;
    delete newData.query;
    delete newData.destinations;
  }

  return newData;
};

const saveOrCreateUrl = (data: any) => data.id ? `api/alerts/${data.id}` : "api/alerts";

const Alert = {
  query: () => axios.get("api/alerts"),
  get: ({
    id
  }: any) => axios.get(`api/alerts/${id}`).then(transformResponse),
  save: (data: any) => axios.post(saveOrCreateUrl(data), transformRequest(data)),
  delete: (data: any) => axios.delete(`api/alerts/${data.id}`),
  mute: (data: any) => axios.post(`api/alerts/${data.id}/mute`),
  unmute: (data: any) => axios.delete(`api/alerts/${data.id}/mute`),
};

export default Alert;
