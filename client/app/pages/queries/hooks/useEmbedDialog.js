import { find } from "lodash";
import { useCallback } from "react";
import EmbedQueryDialog from "@/components/queries/EmbedQueryDialog";

export default function useEmbedDialog(query) {
  return useCallback(
    (unusedQuery, visualizationId) => {
      const visualization = find(query.visualizations, { id: visualizationId });
      EmbedQueryDialog.showModal({ query, visualization });
    },
    [query]
  );
}
