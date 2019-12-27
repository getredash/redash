import axios from "@/services/axios";
import { merge } from "lodash";

// backwards compatibility
const normalizeCondition = {
  "greater than": ">",
  "less than": "<",
  equals: "=",
};

const transformResponse = data =>
  merge({}, data, {
    options: {
      op: normalizeCondition[data.options.op] || data.options.op,
    },
  });

const transformRequest = data => {
  const newData = Object.assign({}, data);
  if (newData.query_id === undefined) {
    newData.query_id = newData.query.id;
    newData.destination_id = newData.destinations;
    delete newData.query;
    delete newData.destinations;
  }

  return newData;
};

const Alert = {
  query: () => axios.get("api/alerts"),
  get: ({ id }) => axios.get(`api/alerts/${id}`).then(transformResponse),
  create: data => axios.post(`api/alerts`, transformRequest(data)),
  save: data => axios.post(`api/alerts/${data.id}`, transformRequest(data)),
  delete: data => axios.delete(`api/alerts/${data.id}`),
  mute: data => axios.post(`api/alerts/${data.id}/mute`),
  unmute: data => axios.delete(`api/alerts/${data.id}/mute`),
};

export default Alert;
