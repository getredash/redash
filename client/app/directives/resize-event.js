import * as _ from 'underscore';
import { requestAnimationFrame } from './utils';

const items = [];
let running = false;

function checkItems() {
  running = items.length > 0;
  if (running) {
    _.each(items, (item) => {
      const offsetWidth = item.node.offsetWidth;
      const offsetHeight = item.node.offsetHeight;
      const clientWidth = item.node.clientWidth;
      const clientHeight = item.node.clientHeight;
      const scrollWidth = item.node.scrollWidth;
      const scrollHeight = item.node.scrollHeight;

      if (
        (item.offsetWidth !== offsetWidth) ||
        (item.offsetHeight !== offsetHeight) ||
        (item.clientWidth !== clientWidth) ||
        (item.clientHeight !== clientHeight) ||
        (item.scrollWidth !== scrollWidth) ||
        (item.scrollHeight !== scrollHeight)
      ) {
        item.offsetWidth = offsetWidth;
        item.offsetHeight = offsetHeight;
        item.clientWidth = clientWidth;
        item.clientHeight = clientHeight;
        item.scrollWidth = scrollWidth;
        item.scrollHeight = scrollHeight;
        item.callback(item);
      }

      requestAnimationFrame(checkItems);
    });
  }
}

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

        if (!running) {
          checkItems();
        }
      }
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('resizeEvent', resizeEvent);
}
