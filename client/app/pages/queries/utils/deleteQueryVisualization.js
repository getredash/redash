import { clone, extend, filter } from "lodash";
import { Visualization } from "@/services/visualization";
import notification from "@/services/notification";

export default function deleteQueryVisualization(query, visualization) {
  return Visualization.delete({ id: visualization.id })
    .$promise.then(() => {
      const filteredVisualizations = filter(query.visualizations, v => v.id !== visualization.id);
      return Promise.resolve(extend(clone(query), { visualizations: filteredVisualizations }));
    })
    .catch(() => {
      notification.error("Error deleting visualization.", "Maybe it's used in a dashboard?");
      return Promise.reject();
    });
}
