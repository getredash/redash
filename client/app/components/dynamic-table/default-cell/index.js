import template from './template.html';

export default function init(ngModule) {
  ngModule.directive('dynamicTableDefaultCell', $sanitize => ({
    template,
    restrict: 'E',
    replace: true,
    scope: {
      column: '=',
      value: '=',
    },
    link: ($scope) => {
      $scope.sanitize = value => $sanitize(value);
    },
  }));
}
