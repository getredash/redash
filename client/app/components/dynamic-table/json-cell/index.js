import { isUndefined, isString } from 'underscore';
import renderJsonView from './json-view-interactive';
import template from './template.html';

const MAX_JSON_SIZE = 50000;

function parseValue(value) {
  if (isString(value) && (value.length <= MAX_JSON_SIZE)) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  }
}

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
        $scope.parsedValue = parseValue($scope.value);
        $scope.isValid = !isUndefined($scope.parsedValue);
        container.empty();
        renderJsonView(container, $scope.parsedValue);
      });
    },
  }));
}
