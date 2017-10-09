import template from './home.html';

function HomeCtrl($scope, $uibModal, currentUser, Events, Dashboard, Query) {
  Events.record('view', 'page', 'personal_homepage');

  // todo: maybe this should come from some serivce as we have this logic elsewhere.
  this.canCreateQuery = currentUser.hasPermission('create_query');
  this.canCreateDashboard = currentUser.hasPermission('create_dashboard');
  this.canCreateAlert = currentUser.hasPermission('list_alerts');

  this.recentQueries = Query.recent();
  this.recentDashboards = Dashboard.recent();

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
