import template from './home.html';

function HomeCtrl($scope, $uibModal, currentUser, Events, Dashboard, Query) {
  Events.record('view', 'page', 'personal_homepage');

  Dashboard.favorites().$promise.then((data) => {
    this.favoriteDashboards = data.results;
  });
  Query.favorites().$promise.then((data) => {
    this.favoriteQueries = data.results;
  });

  this.newDashboard = () => {
    $uibModal.open({
      component: 'editDashboardDialog',
      resolve: {
        dashboard: () => ({ name: null, layout: null }),
      },
    });
  };
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
