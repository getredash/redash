import { useCallback, useRef } from "react";
import Visualization from "@/services/visualization";
import notification from "@/services/notification";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

export default function useReorderVisualizations(query, onChange) {
  const handleChange = useImmutableCallback(onChange);
  // Tracks the most recently started reorder, so a request that's still in flight when a
  // newer one starts knows to leave the outcome to that newer request if it later fails.
  const latestRequestRef = useRef(0);

  return useCallback(
    (orderedVisualizationIds) => {
      const requestId = ++latestRequestRef.current;
      const previousVisualizations = query.visualizations || [];
      const reorderedVisualizations = orderedVisualizationIds.map((visualizationId, position) => ({
        ...previousVisualizations.find((visualization) => visualization.id === visualizationId),
        position,
      }));

      // Move the tabs right away, and roll back if the server rejects the new order.
      handleChange(Object.assign(query.clone(), { visualizations: reorderedVisualizations }));

      return Visualization.reorder({ queryId: query.id, ids: orderedVisualizationIds }).catch(() => {
        if (latestRequestRef.current !== requestId) {
          // A newer reorder already started; its own success/failure handling owns the
          // outcome now, so applying this stale rollback would just undo it.
          return;
        }
        notification.error("Error reordering visualizations.");
        // Roll back on top of whatever the query looks like now, not the snapshot from
        // when this request started, so unrelated changes made in the meantime survive.
        handleChange((currentQuery) => Object.assign(currentQuery.clone(), { visualizations: previousVisualizations }));
      });
    },
    [query, handleChange]
  );
}
