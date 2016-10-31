import template from './page_header.html';

function controller() {

}

export default function (ngModule) {
  ngModule.component('pageHeader', {
    template,
    controller,
    bindings: {
      title: '@',
    },
  });
}
