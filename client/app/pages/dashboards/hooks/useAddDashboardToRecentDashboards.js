import { reduce, map, find } from "lodash";
import { useCallback } from "react";

export default function useAddDashboardToRecentDashboards(dashboardId) {
  return useCallback(() => {
    const currentRecentDashboards = localStorage.getItem("recentDashboards");
    if (!currentRecentDashboards) {
      localStorage.setItem("recentDashboards", JSON.stringify([{ id: dashboardId, priority: 1 }]));
      return;
    }

    const parsedCurrentRecentDashboards = JSON.parse(currentRecentDashboards);
    const currentRecentDashboardsPrioritys = map(
      parsedCurrentRecentDashboards,
      recentDashboard => recentDashboard.priority
    );
    const recentDashboardsIncludesCurrentDashboard =
      find(parsedCurrentRecentDashboards, recentDashboard => recentDashboard.id === dashboardId) !== undefined;
    const biggestPriorityValue = reduce(currentRecentDashboardsPrioritys, (a, b) => Math.max(a, b));
    let dashboardsToSave;
    if(recentDashboardsIncludesCurrentDashboard) {
      dashboardsToSave = map(parsedCurrentRecentDashboards, recentDashboard =>
        recentDashboard.id === dashboardId ? { id: dashboardId, priority: biggestPriorityValue + 1 } : recentDashboard
      )
    } else {
      parsedCurrentRecentDashboards.push({ id: dashboardId, priority: biggestPriorityValue + 1 });
      dashboardsToSave = parsedCurrentRecentDashboards;
    }
    localStorage.setItem("recentDashboards", JSON.stringify(dashboardsToSave));
  }, [dashboardId]);
}
