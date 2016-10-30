function controller() {

}

export default function (ngModule) {
  ngModule.component('pageHome', {
    template: '<div>Home</div>',
    controller,
  });

  return {
    '/': {
      template: '<page-home></page-home>',
    },
  };
}
