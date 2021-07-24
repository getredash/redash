import { axios } from "@/services/axios";

const AlertSubscription = {
  query: ({ alertId }) => axios.get(`api/alerts/${alertId}/subscriptions`),
  create: data => axios.post(`api/alerts/${data.alert_id}/subscriptions`, data),
  delete: data => axios.delete(`api/alerts/${data.alert_id}/subscriptions/${data.id}`),
};

export default AlertSubscription;
