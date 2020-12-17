import React from "react";
import { VisualizationType, registeredVisualizations } from "@redash/viz/lib";

import "./VisualizationName.less";

type Props = {
    visualization: VisualizationType;
};

function VisualizationName({ visualization }: Props) {
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const config = registeredVisualizations[visualization.type];
  return (
    <span className="visualization-name">
      {config && visualization.name !== config.name ? visualization.name : null}
    </span>
  );
}

export default VisualizationName;
