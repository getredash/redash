import * as _ from 'underscore';

function toggleAutoHeightClass($element, isEnabled) {
  const className = 'gridster-auto-height-enabled';
  if (isEnabled) {
    $element.addClass(className);
  } else {
    $element.removeClass(className);
  }
}

function isInUserResize($element) {
  return $element.hasClass('gridster-item-resizing');
}

function computeAutoHeight($element, controller) {
  const wrapper = $element[0];
  const element = wrapper.querySelector('.scrollbox, .spinner-container');
  if (element) {
    const childrenBounds = _.chain(element.children)
      .map((child) => {
        const bounds = child.getBoundingClientRect();
        const style = window.getComputedStyle(child);
        return {
          top: bounds.top - parseFloat(style.marginTop),
          bottom: bounds.bottom + parseFloat(style.marginBottom),
        };
      })
      .reduce((result, bounds) => ({
        top: Math.min(result.top, bounds.top),
        bottom: Math.max(result.bottom, bounds.bottom),
      }))
      .value() || { top: 0, bottom: 0 };

    // Height of controls outside visualization area
    const bodyWrapper = wrapper.querySelector('.body-container');
    if (bodyWrapper) {
      const elementStyle = window.getComputedStyle(element);
      const controlsHeight = _.chain(bodyWrapper.children)
        .filter(node => node !== element)
        .reduce((result, node) => result + node.offsetHeight, 0)
        .value();

      const additionalHeight = _.last(controller.gridster.margins) +
        // include container paddings too
        parseFloat(elementStyle.paddingTop) + parseFloat(elementStyle.paddingBottom) +
        // add few pixels for scrollbar (if visible)
        (element.scrollWidth > element.offsetWidth ? 16 : 0);

      const contentsHeight = childrenBounds.bottom - childrenBounds.top;

      return Math.ceil((controlsHeight + contentsHeight + additionalHeight) /
        controller.gridster.curRowHeight);
    }
  }
  return controller.sizeY;
}

function gridsterAutoHeight($timeout) {
  return {
    restrict: 'A',
    require: 'gridsterItem',
    link($scope, $element, attr, controller) {
      let userResizeFlag = false;
      let sizeYBeforeResize = null;

      // use event instead of watcher
      $scope.$on('gridster-item-resized', () => {
        if (userResizeFlag && (sizeYBeforeResize !== controller.sizeY)) {
          const item = $scope.$eval(attr.gridsterItem);
          item.autoHeight = false;
          toggleAutoHeightClass($element, item.autoHeight);
          $scope.$applyAsync();
        }
        userResizeFlag = false;
        sizeYBeforeResize = null;
      });

      function update() {
        const item = $scope.$eval(attr.gridsterItem);

        if (controller.gridster && item.autoHeight) {
          if (isInUserResize($element)) {
            userResizeFlag = true;
            sizeYBeforeResize = controller.sizeY;
          } else {
            controller.sizeY = computeAutoHeight($element, controller);
            $scope.$applyAsync();
          }
        }

        toggleAutoHeightClass($element, item.autoHeight);
        $timeout(update, 50);
      }

      update();
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('gridsterAutoHeight', gridsterAutoHeight);
}
