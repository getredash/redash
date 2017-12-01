import { isUndefined, isString } from 'underscore';
import renderJsonView from './json-view-interactive';
import template from './template.html';

const MAX_JSON_SIZE = 10000;

export default function init(ngModule) {
  ngModule.directive('dynamicTableJsonCell', () => ({
    template,
    restrict: 'E',
    replace: true,
    scope: {
      column: '=',
      value: '=',
    },
    link: ($scope, $element) => {
      const container = $element.find('.json-cell-valid');

      $scope.isValid = false;
      $scope.parsedValue = null;

      $scope.$watch('value', () => {
        $scope.parsedValue = null;
        $scope.isValid = false;
        if (isString($scope.value) && ($scope.value.length <= MAX_JSON_SIZE)) {
          try {
            $scope.parsedValue = JSON.parse($scope.value);
            $scope.isValid = !isUndefined($scope.parsedValue);
          } catch (e) {
            $scope.parsedValue = null;
          }
        }

        container.empty();
        if ($scope.isValid) {
          renderJsonView(container, $scope.parsedValue);
        }
      });
    },
  }));
}
