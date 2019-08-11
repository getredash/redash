function rdTab($location) {
  return {
    restrict: 'E',
    scope: {
      tabId: '@',
      name: '@',
      basePath: '=?',
    },
    transclude: true,
    template: '<li class="rd-tab" ng-class="{active: tabId==selectedTab}"><a href="{{basePath}}#{{tabId}}">{{name}}<span ng-transclude></span></a></li>',
    replace: true,
    link(scope) {
      scope.basePath = scope.basePath || $location.path().substring(1);
      scope.$watch(
        () => scope.$parent.selectedTab,
        (tab) => { scope.selectedTab = tab; },
      );
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('rdTab', rdTab);
}

init.init = true;
