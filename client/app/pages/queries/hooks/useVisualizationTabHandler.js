import { useState, useEffect, useMemo } from "react";
import { first, orderBy, find } from "lodash";
import { $location, $rootScope } from "@/services/ng";

function updateUrlHash(...args) {
  $location.hash(...args);
  $rootScope.$applyAsync();
}

export default function useVisualizationTabHandler(visualizations) {
  const firstVisualization = useMemo(() => first(orderBy(visualizations, ["id"])) || {}, [visualizations]);
  const [selectedTab, setSelectedTab] = useState(+$location.hash() || firstVisualization.id);

  useEffect(() => {
    const hashValue = selectedTab !== firstVisualization.id ? `${selectedTab}` : null;
    if ($location.hash() !== hashValue) {
      updateUrlHash(hashValue);
    }

    const unwatch = $rootScope.$watch(
      () => $location.hash(),
      () => {
        if ($location.hash() !== hashValue) {
          setSelectedTab(+$location.hash() || firstVisualization.id);
        }
      }
    );
    return unwatch;
  }, [firstVisualization.id, selectedTab]);

  // make sure selectedTab is in visualizations
  useEffect(() => {
    if (!find(visualizations, { id: selectedTab })) {
      setSelectedTab(firstVisualization.id);
    }
  }, [firstVisualization.id, selectedTab, visualizations]);

  return useMemo(() => [selectedTab, setSelectedTab], [selectedTab]);
}
