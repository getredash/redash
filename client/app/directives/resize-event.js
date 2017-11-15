import * as _ from 'underscore';
import { requestAnimationFrame } from './utils';

const items = [];

function checkItems() {
  _.each(items, (item) => {
    const offsetWidth = item.node.offsetWidth;
    const offsetHeight = item.node.offsetHeight;

    if (
      (item.offsetWidth !== offsetWidth) ||
      (item.offsetHeight !== offsetHeight)
    ) {
      item.offsetWidth = offsetWidth;
      item.offsetHeight = offsetHeight;
      item.callback(item);
    }
  });

  requestAnimationFrame(checkItems);
}

checkItems(); // ensure it was called only once!

function resizeEvent() {
  return {
    restrict: 'A',
    link($scope, $element, attrs) {
      const node = $element[0];
      const exists = _.find(items, item => item.node === node);
      if (!exists) {
        items.push({
          node,
          callback: () => {
            $scope.$evalAsync(attrs.resizeEvent);
          },
        });

        $scope.$on('$destroy', () => {
          const index = _.findIndex(items, item => item.node === node);
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
