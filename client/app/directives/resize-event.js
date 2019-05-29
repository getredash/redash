import { findIndex } from 'lodash';

const items = new Map();

function checkItems() {
  items.forEach((item, node) => {
    const bounds = node.getBoundingClientRect();
    // convert to int (because these numbers needed for comparisons), but preserve 1 decimal point
    const width = Math.round(bounds.width * 10);
    const height = Math.round(bounds.height * 10);

    if (
      (item.width !== width) ||
      (item.height !== height)
    ) {
      item.width = width;
      item.height = height;
      item.callback(node);
    }
  });

  setTimeout(checkItems, 100);
}

checkItems(); // ensure it was called only once!

function resizeEvent() {
  return {
    restrict: 'A',
    link($scope, $element, attrs) {
      const node = $element[0];
      if (!items.has(node)) {
        items.set(node, {
          callback: () => {
            $scope.$evalAsync(attrs.resizeEvent);
          },
        });

        $scope.$on('$destroy', () => {
          const index = findIndex(items, item => item.node === node);
          if (index >= 0) {
            items.splice(index, 1); // remove item
          }
        });
      }
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('resizeEvent', resizeEvent);
}

init.init = true;
