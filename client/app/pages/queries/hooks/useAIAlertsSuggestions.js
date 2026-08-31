import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import { axios } from "@/services/axios";
import notification from "@/services/notification";
import recordEvent from "@/services/recordEvent";
import { useMemo, useState } from "react";

export default function useAIAlertsSuggestions() {
  const [gettingAIAlerts, setGettingAIAlerts] = useState(false);
  const [aiAlerts, setAIAlerts] = useState([]);

  const getAIAlerts = useImmutableCallback((query_id) => {
    setGettingAIAlerts(true);
    setAIAlerts([]);

    recordEvent("view", "list", "ai_alerts_suggestions");

    axios
      .get(`api/ai/alerts/${query_id}`)
      .then((data) => {
        setGettingAIAlerts(false);
        setAIAlerts(data.alerts);
      })
      .catch(() => {
        setGettingAIAlerts(false);
        notification.error("Failed to update AI alerts");
      });
  });

  const memoizedAIAlerts = useMemo(() => aiAlerts, [aiAlerts]);

  return { aiAlerts: memoizedAIAlerts, isLoading: gettingAIAlerts, getAIAlerts };
}
