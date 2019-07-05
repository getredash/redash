import { isUndefined, isString } from 'lodash';
import renderJsonView from './json-view-interactive';
import template from './template.html';

function parseValue(value, clientConfig) {
  if (isString(value) && value.length <= clientConfig.tableCellMaxJSONSize) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  }
}

function DynamicTableJsonCell(clientConfig) {
  return {
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
        $scope.parsedValue = parseValue($scope.value, clientConfig);
        $scope.isValid = !isUndefined($scope.parsedValue);
        container.empty();
        renderJsonView(container, $scope.parsedValue);
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('dynamicTableJsonCell', DynamicTableJsonCell);
}

init.init = true;
