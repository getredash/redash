import template from './app_header.html';

function controller() {

}

export default function (ngModule) {
  ngModule.component('appHeader', {
    template,
    controller,
  });
}
