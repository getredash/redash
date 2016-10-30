function controller() {

}

export default function (ngModule) {
  ngModule.component('pageHome', {
    template: '<div>Home {{1923 | durationHumanize}} </div>',
    controller,
  });

  return {
    '/': {
      template: '<page-home></page-home>',
    },
  };
}
