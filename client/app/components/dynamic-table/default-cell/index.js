import { includes, identity } from 'lodash';
import { renderDefault, renderImage, renderLink } from './utils';
import template from './template.html';

const renderFunctions = {
  image: renderImage,
  link: renderLink,
};

export default function init(ngModule) {
  ngModule.directive('dynamicTableDefaultCell', $sanitize => ({
    template,
    restrict: 'E',
    replace: true,
    scope: {
      column: '=',
      row: '=',
    },
    link: ($scope) => {
      // `dynamicTable` will recreate all table cells if some columns changed.
      // This means two things:
      // 1. `column` object will be always "fresh" - no need to watch it.
      // 2. we will always have a column object already available in `link` function.
      // Note that `row` may change during this directive's lifetime.

      if ($scope.column.displayAs === 'string') {
        $scope.allowHTML = $scope.column.allowHTML;
      } else {
        $scope.allowHTML = includes(['image', 'link'], $scope.column.displayAs);
      }

      const sanitize = $scope.allowHTML ? $sanitize : identity;

      const renderValue = renderFunctions[$scope.column.displayAs] || renderDefault;

      $scope.value = sanitize(renderValue($scope.column, $scope.row));

      $scope.$watch('row', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          $scope.value = sanitize(renderValue($scope.column, $scope.row));
        }
      });
    },
  }));
}

init.init = true;
