import { axios } from "@/services/axios";

export const IMG_ROOT = "static/images/destinations";

const Destination = {
  query: () => axios.get("api/destinations"),
  get: ({
    id
  }: any) => axios.get(`api/destinations/${id}`),
  types: () => axios.get("api/destinations/types"),
  create: (data: any) => axios.post(`api/destinations`, data),
  save: (data: any) => axios.post(`api/destinations/${data.id}`, data),
  delete: ({
    id
  }: any) => axios.delete(`api/destinations/${id}`),
};

export default Destination;
