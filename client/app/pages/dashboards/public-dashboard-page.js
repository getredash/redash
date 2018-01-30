import * as _ from 'underscore';
import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './public-dashboard-page.html';
import './dashboard.less';

const PublicDashboardPage = {
  template,
  bindings: {
    dashboard: '<',
  },
  controller(dashboardGridOptions, Dashboard) {
    'ngInject';

    this.dashboardGridOptions = _.extend({}, dashboardGridOptions, {
      resizable: { enabled: false },
      draggable: { enabled: false },
    });

    this.logoUrl = logoUrl;
    this.public = true;
    this.dashboard.widgets = Dashboard.prepareDashboardWidgets(this.dashboard.widgets);
  },
};

export default function init(ngModule) {
  ngModule.component('publicDashboardPage', PublicDashboardPage);

  function loadPublicDashboard($http, $route) {
    'ngInject';

    const token = $route.current.params.token;
    return $http.get(`api/dashboards/public/${token}`).then(response => response.data);
  }

  function session($http, $route, Auth) {
    const token = $route.current.params.token;
    Auth.setApiKey(token);
    return Auth.loadConfig();
  }

  ngModule.config(($routeProvider) => {
    $routeProvider.when('/public/dashboards/:token', {
      template: '<public-dashboard-page dashboard="$resolve.dashboard"></public-dashboard-page>',
      reloadOnSearch: false,
      resolve: {
        dashboard: loadPublicDashboard,
        session,
      },
    });
  });

  return [];
}
