const RdTimeAgo = {
  bindings: {
    value: '=',
  },
  controller() {
  },
  template: '<span>' +
      '<span ng-show="$ctrl.value" am-time-ago="$ctrl.value"></span>' +
      '<span ng-hide="$ctrl.value">-</span>' +
      '</span>',
};

export default function (ngModule) {
  ngModule.component('rdTimeAgo', RdTimeAgo);
}
