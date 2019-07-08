import resizeObserver from '@/services/resizeObserver';

function resizeEvent() {
  return {
    restrict: 'A',
    link($scope, $element, attrs) {
      const unwatch = resizeObserver($element[0], () => {
        $scope.$evalAsync(attrs.resizeEvent);
      });
      $scope.$on('$destroy', unwatch);
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('resizeEvent', resizeEvent);
}

init.init = true;
