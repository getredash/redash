import { react2angular } from 'react2angular';
import { VisualizationType, registeredVisualizations } from './index';

export function VisualizationName({ visualization }) {
  const config = registeredVisualizations[visualization.type];
  if (config) {
    if (visualization.name !== config.name) {
      return visualization.name;
    }
  }

  return null;
}

VisualizationName.propTypes = {
  visualization: VisualizationType.isRequired,
};

export default function init(ngModule) {
  ngModule.component('visualizationName', react2angular(VisualizationName));
}

init.init = true;
