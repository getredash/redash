import React from 'react';
import { react2angular } from 'react2angular';
import { VisualizationType, registeredVisualizations } from './index';

import './VisualizationName.less';

export function VisualizationName({ visualization }) {
  const config = registeredVisualizations[visualization.type];
  return (
    <span className="visualization-name">
      {config && (visualization.name !== config.name) ? visualization.name : null}
    </span>
  );
}

VisualizationName.propTypes = {
  visualization: VisualizationType.isRequired,
};

export default function init(ngModule) {
  ngModule.component('visualizationName', react2angular(VisualizationName));
}

init.init = true;
