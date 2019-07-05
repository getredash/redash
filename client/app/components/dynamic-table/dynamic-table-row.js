import { isFunction } from 'lodash';

export default function init(ngModule) {
  ngModule.directive('dynamicTableRow', () => ({
    template: '',
    // AngularJS has a strange love to table-related tags, therefore
    // we should use this directive as an attribute
    restrict: 'A',
    replace: false,
    scope: {
      columns: '=',
      row: '=',
      render: '=',
    },
    link: ($scope, $element) => {
      $scope.$watch('render', () => {
        if (isFunction($scope.render)) {
          $scope.render($scope, (clonedElement) => {
            $element
              .empty()
              .append(clonedElement)
              .append('<td></td>');
          });
        }
      });
    },
  }));
}

init.init = true;
