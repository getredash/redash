import * as _ from 'underscore';
import { requestAnimationFrame } from './utils';

function gridsterAutoHeight($timeout) {
  return {
    restrict: 'A',
    require: 'gridsterItem',
    link($scope, $element, attr, controller) {
      let destroyed = false;

      function updateHeight() {
        const wrapper = $element[0];
        const element = wrapper.querySelector(attr.gridsterAutoHeight);
        if (element) {
          if (element.scrollHeight > element.offsetHeight) {
            const additionalHeight = wrapper.offsetHeight - element.offsetHeight +
              _.last(controller.gridster.margins);

            const contentsHeight = element.scrollHeight;
            $timeout(() => {
              controller.sizeY = Math.ceil((contentsHeight + additionalHeight) /
                controller.gridster.curRowHeight);
            });
          }
        }

        if (!destroyed) {
          requestAnimationFrame(updateHeight);
        }
      }

      if (controller.sizeY < 0) {
        $element.addClass('gridster-auto-height-enabled');
        updateHeight();

        $scope.$on('$destroy', () => {
          destroyed = true;
        });
      }
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('gridsterAutoHeight', gridsterAutoHeight);
}
