import template from './schema-browser.html';

function schemaBrowser() {
  return {
    restrict: 'E',
    scope: {
      schema: '=',
    },
    template,
    link($scope) {
      $scope.showTable = function (table) {
        table.collapsed = !table.collapsed;
        $scope.$broadcast('vsRepeatTrigger');
      };

      $scope.getSize = function (table) {
        let size = 18;

        if (!table.collapsed) {
          size += 18 * table.columns.length;
        }

        return size;
      };
    },
  };
}

export default function (ngModule) {
  ngModule.directive('schemaBrowser', schemaBrowser);
}
