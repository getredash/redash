import { axios } from "@/services/axios";

const CustomMap = {
  query: () => axios.get("api/custom_maps"),
  get: ({ id }) => axios.get(`api/custom_maps/${id}`),
  create: (data) => axios.post("api/custom_maps", data),
  save: (data) => axios.post(`api/custom_maps/${data.id}`, data),
  delete: ({ id }) => axios.delete(`api/custom_maps/${id}`),
};

export default CustomMap;
