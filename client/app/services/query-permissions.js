import { axios } from "@/services/axios";

const Query = {
  getPermissions: ({ id }) => axios.get(`api/queries/${id}/permissions`),
  savePermissions: ({ id }, data) => axios.post(`api/queries/${id}/permissions`, data),
};

export default Query;