import debug from 'debug';

import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './app-header.html';
import './app-header.css';

const logger = debug('redash:appHeader');

function controller($rootScope, $location, $uibModal, Auth, currentUser, clientConfig, Dashboard, Query) {
  this.logoUrl = logoUrl;
  this.basePath = clientConfig.basePath;
  this.currentUser = currentUser;
  this.showQueriesMenu = currentUser.hasPermission('view_query');
  this.showAlertsLink = currentUser.hasPermission('list_alerts');
  this.showNewQueryMenu = currentUser.hasPermission('create_query');
  this.showSettingsMenu = currentUser.hasPermission('list_users');
  this.showDashboardsMenu = currentUser.hasPermission('list_dashboards');

  this.reload = () => {
    logger('Reloading dashboards and queries.');
    this.dashboards = Dashboard.favorites();
    this.queries = Query.favorites();
  };

  this.reload();

  $rootScope.$on('reloadFavorites', this.reload);

  this.newDashboard = () => {
    $uibModal.open({
      component: 'editDashboardDialog',
      resolve: {
        dashboard: () => ({ name: null, layout: null }),
      },
    });
  };

  this.searchQueries = () => {
    $location.path('/queries').search({ q: this.term });
  };

  this.logout = () => {
    Auth.logout();
  };
}

export default function init(ngModule) {
  ngModule.component('appHeader', {
    template,
    controller,
  });
}
