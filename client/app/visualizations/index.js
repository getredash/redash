import { react2angular } from 'react2angular';
import EditVisualizationDialog from './edit-visualization-dialog';
import visualizationRegistry from './registry';
import VisualizationRenderer from './VisualizationRenderer';
import VisualizationOptionsEditor from './VisualizationOptionsEditor';

function VisualizationProvider() {
  this.$get = ($resource) => {
    const Visualization = $resource('api/visualizations/:id', { id: '@id' });
    Visualization.visualizations = visualizationRegistry;
    return Visualization;
  };
}

function VisualizationName(Visualization) {
  return {
    restrict: 'E',
    scope: {
      visualization: '=',
    },
    template: '{{name}}',
    replace: false,
    link(scope) {
      if (Visualization.visualizations[scope.visualization.type]) {
        const defaultName = Visualization.visualizations[scope.visualization.type].name;
        if (defaultName !== scope.visualization.name) {
          scope.name = scope.visualization.name;
        }
      }
    },
  };
}

export default function init(ngModule) {
  ngModule.provider('Visualization', VisualizationProvider);
  ngModule.component('visualizationRenderer', react2angular(VisualizationRenderer, null, ['clientConfig']));
  ngModule.component('visualizationOptionsEditor', react2angular(VisualizationOptionsEditor, null, ['clientConfig']));
  ngModule.component('visualizationName', VisualizationName);
  ngModule.component('editVisualizationDialog', EditVisualizationDialog);
}

init.init = true;
