import React from "react";
import { VisualizationType } from "./prop-types";
import registeredVisualizations from "./index";

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
