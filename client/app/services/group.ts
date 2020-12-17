import { axios } from "@/services/axios";

const Group = {
  query: () => axios.get("api/groups"),
  get: ({
    id
  }: any) => axios.get(`api/groups/${id}`),
  create: (data: any) => axios.post(`api/groups`, data),
  save: (data: any) => axios.post(`api/groups/${data.id}`, data),
  delete: (data: any) => axios.delete(`api/groups/${data.id}`),
  members: ({
    id
  }: any) => axios.get(`api/groups/${id}/members`),
  addMember: ({
    id
  }: any, data: any) => axios.post(`api/groups/${id}/members`, data),
  removeMember: ({
    id,
    userId
  }: any) => axios.delete(`api/groups/${id}/members/${userId}`),
  dataSources: ({
    id
  }: any) => axios.get(`api/groups/${id}/data_sources`),
  addDataSource: ({
    id
  }: any, data: any) => axios.post(`api/groups/${id}/data_sources`, data),
  removeDataSource: ({
    id,
    dataSourceId
  }: any) => axios.delete(`api/groups/${id}/data_sources/${dataSourceId}`),
  updateDataSource: ({
    id,
    dataSourceId
  }: any, data: any) => axios.post(`api/groups/${id}/data_sources/${dataSourceId}`, data),
};

export default Group;
