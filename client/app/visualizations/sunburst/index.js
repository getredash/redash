import { debounce } from 'underscore';
import Sunburst from '@/lib/visualizations/sunburst';
import editorTemplate from './sunburst-sequence-editor.html';

function sunburstSequenceRenderer() {
  return {
    restrict: 'E',
    template: '<div class="sunburst-visualization-container" resize-event="handleResize()"></div>',
    link(scope, element) {
      const container = element[0].querySelector('.sunburst-visualization-container');
      let sunburst = new Sunburst(scope, container);

      function resize() {
        sunburst.remove();
        sunburst = new Sunburst(scope, container);
      }

      scope.handleResize = debounce(resize, 50);

      scope.$watch('visualization.options.height', (oldValue, newValue) => {
        if (oldValue !== newValue) {
          resize();
        }
      });
    },
  };
}

function sunburstSequenceEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
  };
}

export default function init(ngModule) {
  ngModule.directive('sunburstSequenceRenderer', sunburstSequenceRenderer);
  ngModule.directive('sunburstSequenceEditor', sunburstSequenceEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
      '<sunburst-sequence-renderer options="visualization.options" query-result="queryResult"></sunburst-sequence-renderer>';

    const editTemplate = '<sunburst-sequence-editor></sunburst-sequence-editor>';
    const defaultOptions = {
      defaultRows: 7,
    };

    VisualizationProvider.registerVisualization({
      type: 'SUNBURST_SEQUENCE',
      name: 'Sunburst Sequence',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
