import { axios } from "@/services/axios";

export const IMG_ROOT = "static/images/destinations";

const Destination = {
  query: () => axios.get("api/destinations"),
  get: ({ id }) => axios.get(`api/destinations/${id}`),
  types: () => axios.get("api/destinations/types"),
  create: data => axios.post(`api/destinations`, data),
  save: data => axios.post(`api/destinations/${data.id}`, data),
  delete: ({ id }) => axios.delete(`api/destinations/${id}`),
};

export default Destination;
