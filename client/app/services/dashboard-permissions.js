import { axios } from "@/services/axios";

const Dashboard = {
  getPermissions: ({ id }) => axios.get(`api/dashboards/${id}/permissions`),
  savePermissions: ({ id }, data) => axios.post(`api/dashboards/${id}/permissions`, data),
};

export default Dashboard;