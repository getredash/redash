import { useState, useEffect, useMemo } from "react";
import { first, orderBy, find } from "lodash";
import location from "@/services/location";

export default function useVisualizationTabHandler(visualizations: any) {
  const firstVisualization = useMemo(() => first(orderBy(visualizations, ["id"])) || {}, [visualizations]);
  // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
  const [selectedTab, setSelectedTab] = useState(+location.hash || firstVisualization.id);

  useEffect(() => {
    const hashValue = selectedTab !== firstVisualization.id ? `${selectedTab}` : null;
    if (location.hash !== hashValue) {
      location.setHash(hashValue);
    }

    const unlisten = location.listen(() => {
      if (location.hash !== hashValue) {
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        setSelectedTab(+location.hash || firstVisualization.id);
      }
    });
    return unlisten;
  }, [firstVisualization.id, selectedTab]);

  // make sure selectedTab is in visualizations
  useEffect(() => {
    if (!find(visualizations, { id: selectedTab })) {
      setSelectedTab(firstVisualization.id);
    }
  }, [firstVisualization.id, selectedTab, visualizations]);

  return useMemo(() => [selectedTab, setSelectedTab], [selectedTab]);
}
