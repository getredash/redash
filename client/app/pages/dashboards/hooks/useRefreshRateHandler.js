import { isNaN, max, min } from "lodash";
import { useEffect, useState } from "react";
import location from "@/services/location";
import { policy } from "@/services/policy";

function getLimitedRefreshRate(refreshRate) {
  const allowedIntervals = policy.getDashboardRefreshIntervals();
  return max([30, min(allowedIntervals), refreshRate]);
}

function getRefreshRateFromUrl() {
  const refreshRate = parseFloat(location.search.refresh);
  return isNaN(refreshRate) ? null : getLimitedRefreshRate(refreshRate);
}

export default function useRefreshRateHandler(refreshDashboard) {
  const [refreshRate, setRefreshRate] = useState(getRefreshRateFromUrl());

  useEffect(() => {
    location.setSearch({ refresh: refreshRate || null }, true);
    if (refreshRate) {
      const refreshTimer = setInterval(refreshDashboard, refreshRate * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [refreshDashboard, refreshRate]);

  return [refreshRate, rate => setRefreshRate(getLimitedRefreshRate(rate)), () => setRefreshRate(null)];
}
