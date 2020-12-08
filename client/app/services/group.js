import { axios } from "@/services/axios";

const Group = {
  query: () => axios.get("api/groups"),
  get: ({ id }) => axios.get(`api/groups/${id}`),
  create: data => axios.post(`api/groups`, data),
  save: data => axios.post(`api/groups/${data.id}`, data),
  delete: data => axios.delete(`api/groups/${data.id}`),
  members: ({ id }) => axios.get(`api/groups/${id}/members`),
  addMember: ({ id }, data) => axios.post(`api/groups/${id}/members`, data),
  removeMember: ({ id, userId }) => axios.delete(`api/groups/${id}/members/${userId}`),
  dataSources: ({ id }) => axios.get(`api/groups/${id}/data_sources`),
  addDataSource: ({ id }, data) => axios.post(`api/groups/${id}/data_sources`, data),
  removeDataSource: ({ id, dataSourceId }) => axios.delete(`api/groups/${id}/data_sources/${dataSourceId}`),
  updateDataSource: ({ id, dataSourceId }, data) => axios.post(`api/groups/${id}/data_sources/${dataSourceId}`, data),
};

export default Group;
