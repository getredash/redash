import template from './home.html';

function HomeCtrl(Events, Dashboard, Query) {
  Events.record('view', 'page', 'personal_homepage');

  this.noDashboards = false;
  this.noQueries = false;


  Dashboard.favorites().$promise.then((data) => {
    this.favoriteDashboards = data.results;
    this.noDashboards = data.results.length === 0;
  });
  Query.favorites().$promise.then((data) => {
    this.favoriteQueries = data.results;
    this.noQueries = data.results.length === 0;
  });
}

export default function init(ngModule) {
  ngModule.component('homePage', {
    template,
    controller: HomeCtrl,
  });

  return {
    '/': {
      template: '<home-page></home-page>',
      title: 'Redash',
    },
  };
}

init.init = true;

