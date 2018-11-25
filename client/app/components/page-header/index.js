import template from './page-header.html';

function controller() {}

export default function init(ngModule) {
  ngModule.component('pageHeader', {
    template,
    controller,
    transclude: true,
    bindings: {
      title: '@',
    },
  });
}

init.init = true;
