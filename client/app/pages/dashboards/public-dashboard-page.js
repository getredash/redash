import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './public-dashboard-page.html';
import './dashboard.less';

function loadDashboard($http, $route) {
  const token = $route.current.params.token;
  return $http.get(`api/dashboards/public/${token}`).then(response => response.data);
}

const PublicDashboardPage = {
  template,
  controller($timeout, $location, $http, $route, $scope, dashboardGridOptions, Dashboard) {
    'ngInject';

    this.dashboardGridOptions = Object.assign({}, dashboardGridOptions, {
      resizable: { enabled: false },
      draggable: { enabled: false },
    });

    this.logoUrl = logoUrl;
    this.public = true;
    this.globalParameters = [];

    this.extractGlobalParameters = () => {
      this.globalParameters = this.dashboard.getParametersDefs();
    };

    $scope.$on('dashboard.update-parameters', () => {
      this.extractGlobalParameters();
    });

    const refreshRate = Math.max(30, parseFloat($location.search().refresh));

    const refresh = () => {
      loadDashboard($http, $route).then((data) => {
        this.dashboard = new Dashboard(data);
        this.dashboard.widgets = Dashboard.prepareDashboardWidgets(this.dashboard.widgets);
        this.extractGlobalParameters();
      });
    };

    if (refreshRate) {
      $timeout(refresh, refreshRate * 1000.0);
    }

    refresh();
  },
};

export default function init(ngModule) {
  ngModule.component('publicDashboardPage', PublicDashboardPage);

  function session($http, $route, Auth) {
    const token = $route.current.params.token;
    Auth.setApiKey(token);
    return Auth.loadConfig();
  }

  ngModule.config(($routeProvider) => {
    $routeProvider.when('/public/dashboards/:token', {
      template: '<public-dashboard-page></public-dashboard-page>',
      reloadOnSearch: false,
      resolve: {
        session,
      },
    });
  });

  return [];
}

init.init = true;
