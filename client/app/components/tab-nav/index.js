function controller($location) {
  this.tabs.forEach((tab) => {
    if (tab.isActive) {
      tab.active = tab.isActive($location.path());
    } else {
      tab.active = $location.path().startsWith(`/${tab.path}`);
    }
  });
}

export default function init(ngModule) {
  ngModule.component('tabNav', {
    template: '<ul class="tab-nav bg-white">' +
                '<li ng-repeat="tab in $ctrl.tabs" ng-class="{\'active\': tab.active }"><a ng-href="{{tab.path}}">{{tab.name}}</a></li>' +
              '</ul>',
    controller,
    bindings: {
      tabs: '<',
    },
  });
}

init.init = true;

