import { useCallback } from "react";
import { find } from "lodash";

import AddToDashboardDialog from "@/components/queries/AddToDashboardDialog";

export default function useAddToDashboardDialog(query) {
  return useCallback(
    visualizationId => {
      const visualization = find(query.visualizations, { id: visualizationId });
      AddToDashboardDialog.showModal({ visualization });
    },
    [query.visualizations]
  );
}
