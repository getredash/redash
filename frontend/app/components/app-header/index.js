import { omit, groupBy, sortBy } from 'underscore';

import template from './app_header.html';
import logoUrl from '../../assets/images/redash_icon_small.png';

function controller($scope, $location, currentUser, Dashboard) {
  this.dashboards = [];
  // TODO: logoUrl should come from clientconfig
  this.logoUrl = logoUrl;
  this.showQueriesMenu = currentUser.hasPermission('view_query');
  this.showNewQueryMenu = currentUser.hasPermission('create_query');
  this.showSettingsMenu = currentUser.hasPermission('list_users');
  this.currentUser = currentUser;

  this.reloadDashboards = () => {
    Dashboard.query((dashboards) => {
      this.dashboards = sortBy(dashboards, 'name');
      this.allDashboards = groupBy(this.dashboards, (d) => {
        const parts = d.name.split(':');
        if (parts.length === 1) {
          return 'Other';
        }
        return parts[0];
      });

      this.otherDashboards = this.allDashboards.Other || [];
      this.groupedDashboards = omit(this.allDashboards, 'Other');
      this.showDashboardsMenu = this.groupedDashboards.length > 0 || this.otherDashboards.length > 0 || currentUser.hasPermission('create_dashboard');
    });
  };

  this.searchQueries = () => {
    $location.path('/queries/search').search({ q: $scope.term });
  };

  this.reloadDashboards();
  // $scope.currentUser = currentUser;
}

export default function (ngModule) {
  ngModule.component('appHeader', {
    template,
    controller,
  });
}
