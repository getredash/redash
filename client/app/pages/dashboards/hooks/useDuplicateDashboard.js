import { useCallback } from "react";
import { Dashboard } from "@/services/dashboard";

export default function useDuplicateDashboard(dashboard) {
  const duplicateDashboard = useCallback(() => {
    const dashboardSlug = dashboard.slug;
    Dashboard.copy({ slug: dashboardSlug }).then(({ slug }) => {
      window.open(`dashboard/${slug}`);
    });
  }, [dashboard]);

  return duplicateDashboard;
}
