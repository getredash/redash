import template from './type-picker.html';

export default function init(ngModule) {
  ngModule.component('typePicker', {
    template,
    bindings: {
      types: '<',
      title: '@',
      imgRoot: '@',
      onTypeSelect: '=',
    },
    controller() {
      this.filter = {};
    },
  });
}

init.init = true;
