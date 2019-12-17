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
    const newHashValue = selectedTab !== firstVisualization.id ? `${selectedTab}` : null;
    if ($location.hash() !== newHashValue) {
      updateUrlHash(newHashValue);
    }
  }, [firstVisualization.id, selectedTab]);

  useEffect(() => {
    const unwatch = $rootScope.$watch(
      () => $location.hash(),
      () => {
        const expectedHashValue = selectedTab !== firstVisualization.id ? `${selectedTab}` : null;
        if ($location.hash() !== expectedHashValue) {
          setSelectedTab(+$location.hash() || firstVisualization.id);
        }
      },
    );
    return unwatch;
  }, [firstVisualization.id, selectedTab]);

  return [selectedTab, setSelectedTab];
}
