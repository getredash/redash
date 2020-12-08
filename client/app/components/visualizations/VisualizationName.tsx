import React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '@red... Remove this comment to see the full error message
import { VisualizationType, registeredVisualizations } from "@redash/viz/lib";

import "./VisualizationName.less";

type Props = {
    visualization: VisualizationType;
};

function VisualizationName({ visualization }: Props) {
  const config = registeredVisualizations[visualization.type];
  return (
    <span className="visualization-name">
      {config && visualization.name !== config.name ? visualization.name : null}
    </span>
  );
}

export default VisualizationName;
