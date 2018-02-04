import { contains } from 'underscore';
import { renderDefault, renderImage, renderLink } from './utils';
import template from './template.html';

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
        $scope.allowHTML = contains(['image', 'link'], $scope.column.displayAs);
      }

      let renderValue;
      switch ($scope.column.displayAs) {
        case 'image': renderValue = renderImage; break;
        case 'link': renderValue = renderLink; break;
        default: renderValue = renderDefault; break;
      }

      $scope.value = $sanitize(renderValue($scope.column, $scope.row));

      $scope.$watch('row', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          $scope.value = $sanitize(renderValue($scope.column, $scope.row));
        }
      });
    },
  }));
}
