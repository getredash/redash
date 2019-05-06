import { findIndex } from 'lodash';

const items = new Map();

function checkItems() {
  items.forEach((item, node) => {
    const offsetWidth = node.offsetWidth;
    const offsetHeight = node.offsetHeight;

    if (
      (item.offsetWidth !== offsetWidth) ||
      (item.offsetHeight !== offsetHeight)
    ) {
      item.offsetWidth = offsetWidth;
      item.offsetHeight = offsetHeight;
      item.callback(node);
    }
  });

  setTimeout(checkItems, 50);
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
