import { extend, filter, isFunction } from "lodash";
import { useRef, useCallback } from "react";
import { Visualization } from "@/services/visualization";
import notification from "@/services/notification";

export default function useDeleteVisualization(query, onChange) {
  const onChangeRef = useRef();
  onChangeRef.current = isFunction(onChange) ? onChange : () => {};

  return useCallback(
    visualizationId =>
      Visualization.delete({ id: visualizationId })
        .$promise.then(() => {
          const filteredVisualizations = filter(query.visualizations, v => v.id !== visualizationId);
          onChangeRef.current(extend(query.clone(), { visualizations: filteredVisualizations }));
        })
        .catch(() => {
          notification.error("Error deleting visualization.", "Maybe it's used in a dashboard?");
        }),
    [query]
  );
}
