import { axios } from "@/services/axios";

const AI = {
  types: () => axios.get(`api/ai/types`),
  models: (data) => axios.post(`api/ai/models`, data),
};

export default AI;
