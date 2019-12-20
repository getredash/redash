import { clone, extend, filter, get } from "lodash";
import EditVisualizationDialog from "@/visualizations/EditVisualizationDialog";

export function editQueryVisualization(query, queryResult, visualization) {
  return EditVisualizationDialog.showModal({
    query,
    visualization,
    queryResult,
  }).result.then(updatedVisualization => {
    const filteredVisualizations = filter(query.visualizations, v => v.id !== updatedVisualization.id);
    return Promise.resolve({
      query: extend(clone(query), { visualizations: [...filteredVisualizations, updatedVisualization] }),
      visualization: updatedVisualization,
    });
  });
}

export function addQueryVisualization(query, queryResult) {
  return editQueryVisualization(query, queryResult, null);
}
