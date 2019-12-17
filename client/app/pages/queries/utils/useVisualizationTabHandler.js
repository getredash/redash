import { useState, useEffect, useMemo } from "react";
import { first, orderBy, isFunction } from "lodash";
import { $location, $rootScope } from "@/services/ng";

function updateUrlHash(...args) {
  $location.hash(...args);
  $rootScope.$applyAsync();
}

export default function useVisualizationTabHandler(visualizations, onAddVisualizationInUrl) {
  const firstVisualization = useMemo(() => first(orderBy(visualizations, ["id"])), [visualizations]);
  const [selectedTab, setSelectedTab] = useState(+$location.hash() || firstVisualization.id);

  useEffect(() => {
    if ($location.hash() !== "add") {
      updateUrlHash(selectedTab !== firstVisualization.id ? selectedTab : null);
    }
  }, [firstVisualization.id, selectedTab]);

  useEffect(() => {
    if ($location.hash() === "add") {
      updateUrlHash(null);
      if (isFunction(onAddVisualizationInUrl)) {
        onAddVisualizationInUrl();
      }
    }
  }, [onAddVisualizationInUrl]);

  return [selectedTab, setSelectedTab];
}
