import { isFunction, extend, filter, find } from "lodash";
import { useCallback, useRef } from "react";
import EditVisualizationDialog from "@/visualizations/EditVisualizationDialog";

export default function useEditVisualizationDialog(query, queryResult, onChange) {
  const onChangeRef = useRef();
  onChangeRef.current = isFunction(onChange) ? onChange : () => {};

  return useCallback(
    (visualizationId = null) => {
      const visualization = find(query.visualizations, { id: visualizationId }) || null;
      EditVisualizationDialog.showModal({
        query,
        visualization,
        queryResult,
      }).result.then(updatedVisualization => {
        const filteredVisualizations = filter(query.visualizations, v => v.id !== updatedVisualization.id);
        onChangeRef.current(
          extend(query.clone(), { visualizations: [...filteredVisualizations, updatedVisualization] }),
          updatedVisualization
        );
      });
    },
    [query, queryResult]
  );
}
