import { debounce } from 'lodash';
import Sunburst from '@/lib/visualizations/sunburst';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import Editor from './Editor';

const SunburstSequenceRenderer = {
  template: '<div class="sunburst-visualization-container" resize-event="handleResize()"></div>',
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope, $element) {
    const container = $element[0].querySelector('.sunburst-visualization-container');
    let sunburst = new Sunburst($scope, container);

    function update() {
      sunburst.remove();
      sunburst = new Sunburst($scope, container);
    }

    $scope.handleResize = debounce(update, 50);
  },
};

export default function init(ngModule) {
  ngModule.component('sunburstSequenceRenderer', SunburstSequenceRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'SUNBURST_SEQUENCE',
      name: 'Sunburst Sequence',
      getOptions: options => ({ ...options }),
      Renderer: angular2react('sunburstSequenceRenderer', SunburstSequenceRenderer, $injector),
      Editor,

      defaultRows: 7,
    });
  });
}

init.init = true;
