class HomeController {
  constructor(Dashboard) {
    console.log(Dashboard.query());
  }
}

export default function (ngModule) {
  ngModule.component('pageHome', {
    template: '<div>Home {{1923 | durationHumanize}} </div>',
    controller: HomeController,
  });

  return {
    '/': {
      template: '<page-home></page-home>',
    },
  };
}
