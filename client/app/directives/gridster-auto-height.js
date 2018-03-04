import * as _ from 'underscore';
import { requestAnimationFrame } from './utils';

function gridsterAutoHeight($timeout, $parse) {
  return {
    restrict: 'A',
    require: 'gridsterItem',
    link($scope, $element, attr, controller) {
      let autoSized = true;

      const itemGetter = $parse(attr.gridsterItem);

      $scope.$watch(attr.gridsterItem, (newValue, oldValue) => {
        const item = _.extend({}, itemGetter($scope));
        if (_.isObject(newValue) && _.isObject(oldValue)) {
          if ((newValue.sizeY !== oldValue.sizeY) && !autoSized) {
            item.autoHeight = false;
            if (_.isFunction(itemGetter.assign)) {
              itemGetter.assign($scope, item);
            }
          }
        }
        if (item.autoHeight) {
          $element.addClass('gridster-auto-height-enabled');
        } else {
          $element.removeClass('gridster-auto-height-enabled');
        }
        autoSized = false;
      }, true);

      function updateHeight() {
        const item = _.extend({}, itemGetter($scope));

        if (controller.gridster && item.autoHeight) {
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
              const sizeY = Math.ceil((contentsHeight + additionalHeight) /
                controller.gridster.curRowHeight);
              if (controller.sizeY !== sizeY) {
                autoSized = true;
                controller.sizeY = sizeY;
              } else {
                autoSized = false;
              }
            });
          }

          requestAnimationFrame(updateHeight);
        }
      }

      updateHeight();
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('gridsterAutoHeight', gridsterAutoHeight);
}
