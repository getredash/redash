import { axios } from "@/services/axios";

const saveOrCreateUrl = data => (data.id ? `api/visualizations/${data.id}` : "api/visualizations");

const Visualization = {
  save: data => axios.post(saveOrCreateUrl(data), data),
  delete: data => axios.delete(`api/visualizations/${data.id}`),
};

export default Visualization;
