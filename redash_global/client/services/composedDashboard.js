import { axios } from "./axios";

const ComposedDashboardService = {
  query: (params) => axios.get("composed-dashboards", { params }),
  get: (id) => axios.get(`composed-dashboards/${id}`),
  create: (data) => axios.post("composed-dashboards", data),
  delete: (id) => axios.delete(`composed-dashboards/${id}`),
  deploy: (id, comment) => axios.post(`composed-dashboards/${id}/deploy`, { comment }),
  deploymentRuns: (id, params) => axios.get(`composed-dashboards/${id}/deployment-runs`, { params }),
  getEntries: (id) => axios.get(`composed-dashboards/${id}/entries`),
  addEntry: (id, templateDashboardId) =>
    axios.post(`composed-dashboards/${id}/entries`, { template_dashboard_id: templateDashboardId }),
  removeEntry: (id, entryId) => axios.delete(`composed-dashboards/${id}/entries/${entryId}`),
  reorderEntries: (id, entryIds) =>
    axios.post(`composed-dashboards/${id}/entries/reorder`, { entry_ids: entryIds }),
};

export default ComposedDashboardService;
