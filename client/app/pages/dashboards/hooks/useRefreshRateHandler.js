import { isNaN, max, min } from "lodash";
import { useEffect, useState, useMemo } from "react";
import location from "@/services/location";
import { policy } from "@/services/policy";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

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

  // `refreshDashboard` may change quite frequently (on every update of `dashboard` instance), but we
  // have to keep the same timer running, because timer will restart when re-creating, and instead of
  // running refresh every N seconds - it will run refresh every N seconds after last dashboard update
  // (which is not right obviously)
  const doRefreshDashboard = useImmutableCallback(refreshDashboard);

  // URL and timer should be updated only when `refreshRate` changes
  useEffect(() => {
    location.setSearch({ refresh: refreshRate || null }, true);
    if (refreshRate) {
      const refreshTimer = setInterval(doRefreshDashboard, refreshRate * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [refreshRate, doRefreshDashboard]);

  return useMemo(() => [refreshRate, rate => setRefreshRate(getLimitedRefreshRate(rate)), () => setRefreshRate(null)], [
    refreshRate,
  ]);
}
