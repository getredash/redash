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
        // Query element, but keep selector order
        const element = _.chain(attr.gridsterAutoHeight.split(','))
          .map(selector => wrapper.querySelector(selector))
          .filter(_.isObject)
          .first()
          .value();
        if (element) {
          const childrenBounds = _.chain(element.children)
            .map(child => child.getBoundingClientRect())
            .reduce((result, bounds) => ({
              left: Math.min(result.left, bounds.left),
              top: Math.min(result.top, bounds.top),
              right: Math.min(result.right, bounds.right),
              bottom: Math.min(result.bottom, bounds.bottom),
            }))
            .value();

          const additionalHeight = 100 + _.last(controller.gridster.margins);
          const contentsHeight = childrenBounds.bottom - childrenBounds.top;
          $timeout(() => {
            controller.sizeY = Math.ceil((contentsHeight + additionalHeight) /
              controller.gridster.curRowHeight);
          });
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
