import { useState, useEffect, useMemo } from "react";
import { first, orderBy } from "lodash";
import { $location, $rootScope } from "@/services/ng";

function updateUrlHash(...args) {
  $location.hash(...args);
  $rootScope.$applyAsync();
}

export default function useVisualizationTabHandler(visualizations) {
  const firstVisualization = useMemo(() => first(orderBy(visualizations, ["id"])), [visualizations]);
  const [selectedTab, setSelectedTab] = useState(+$location.hash() || firstVisualization.id);

  useEffect(() => {
    const hashValue = selectedTab !== firstVisualization.id ? `${selectedTab}` : null;
    if ($location.hash() !== hashValue) {
      updateUrlHash(hashValue);
    }
  }, [firstVisualization.id, selectedTab]);

  useEffect(() => {
    const unwatch = $rootScope.$watch(
      () => $location.hash(),
      () => {
        const hashValue = selectedTab !== firstVisualization.id ? `${selectedTab}` : null;
        if ($location.hash() !== hashValue) {
          setSelectedTab(+$location.hash() || firstVisualization.id);
        }
      },
    );
    return unwatch;
  }, [firstVisualization.id, selectedTab]);

  return [selectedTab, setSelectedTab];
}
