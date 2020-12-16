import { axios } from "@/services/axios";

const saveOrCreateUrl = (data: any) => data.id ? `api/visualizations/${data.id}` : "api/visualizations";

const Visualization = {
  save: (data: any) => axios.post(saveOrCreateUrl(data), data),
  delete: (data: any) => axios.delete(`api/visualizations/${data.id}`),
};

export default Visualization;
