import template from './public-dashboard-page.html';
import logoUrl from '../../assets/images/redash_icon_small.png';

const PublicDashboardPage = {
  template,
  bindings: {
    dashboard: '<',
  },
  controller($routeParams, Widget) {
    // embed in params == headless
    this.logoUrl = logoUrl;
    this.headless = $routeParams.embed;
    if (this.headless) {
      document.querySelector('body').classList.add('headless');
    }
    this.public = true;
    this.dashboard.widgets = this.dashboard.widgets.map(row =>
       row.map(widget =>
         new Widget(widget)
      )
    );
  },
};

export default function (ngModule) {
  ngModule.component('publicDashboardPage', PublicDashboardPage);

  function loadPublicDashboard($http, $route) {
    const token = $route.current.params.token;
    return $http.get(`/api/dashboards/public/${token}`).then(response =>
       response.data
    );
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
}
