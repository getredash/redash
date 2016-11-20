import jQuery from 'jquery';
import Sunburst from './sunburst';
import editorTemplate from './sunburst-sequence-editor.html';

function sunburstSequenceRenderer() {
  return {
    restrict: 'E',
    link(scope, element) {
      let sunburst = new Sunburst(scope, element);

      function resize() {
        sunburst.remove();
        sunburst = new Sunburst(scope, element);
      }

      jQuery(window).on('resize', resize);
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

export default function (ngModule) {
  ngModule.directive('sunburstSequenceRenderer', sunburstSequenceRenderer);
  ngModule.directive('sunburstSequenceEditor', sunburstSequenceEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
      '<sunburst-sequence-renderer options="visualization.options" query-result="queryResult"></sunburst-sequence-renderer>';

    const editTemplate = '<sunburst-sequence-editor></sunburst-sequence-editor>';
    const defaultOptions = {
      height: 300,
    };

    VisualizationProvider.registerVisualization({
      type: 'SUNBURST_SEQUENCE',
      name: 'Sunburst Sequence',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  }
  );
}
