import React from "react";
import { VisualizationType, registeredVisualizations } from "@redash/viz/lib";

import "./VisualizationName.less";

function VisualizationName({ visualization }) {
  const config = registeredVisualizations[visualization.type];
  return (
    <span className="visualization-name">
      {config && visualization.name !== config.name ? visualization.name : null}
    </span>
  );
}

VisualizationName.propTypes = {
  visualization: VisualizationType.isRequired,
};

export default VisualizationName;
