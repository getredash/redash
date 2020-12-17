import { axios } from "@/services/axios";

const AlertSubscription = {
  query: ({
    alertId
  }: any) => axios.get(`api/alerts/${alertId}/subscriptions`),
  create: (data: any) => axios.post(`api/alerts/${data.alert_id}/subscriptions`, data),
  delete: (data: any) => axios.delete(`api/alerts/${data.alert_id}/subscriptions/${data.id}`),
};

export default AlertSubscription;
