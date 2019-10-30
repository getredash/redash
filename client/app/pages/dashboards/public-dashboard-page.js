import PromiseRejectionError from '@/lib/promise-rejection-error';
import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './public-dashboard-page.html';
import dashboardGridOptions from '@/config/dashboard-grid-options';
import _ from 'lodash';
import './dashboard.less';

function loadDashboard($http, $route) {
  const token = $route.current.params.token;
  return $http.get(`api/dashboards/public/${token}`).then(response => response.data);
}

const PublicDashboardPage = {
  template,
  bindings: {
    dashboard: '<',
  },
  controller($scope, $timeout, $location, $http, $route, Dashboard) {
    'ngInject';

    this.filters = [];
    let currentQueryResultsErrorData;

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

    const refreshRate = Math.max(30, parseFloat($location.search().refresh));

    // ANGULAR_REMOVE_ME This forces Widgets re-rendering
    // use state when PublicDashboard is migrated to React
    this.forceDashboardGridReload = () => {
      this.dashboard.widgets = [...this.dashboard.widgets];
    };

    this.loadWidget = (widget, forceRefresh = false) => {
      widget.getParametersDefs(); // Force widget to read parameters values from URL
      this.forceDashboardGridReload();
      return widget.load(forceRefresh).finally(this.forceDashboardGridReload);
    };

    this.refreshWidget = widget => this.loadWidget(widget, true);

    this.refreshDashboard = () => {
      loadDashboard($http, $route).then((data) => {
        this.dashboard = new Dashboard(data);
        this.dashboard.widgets = Dashboard.prepareDashboardWidgets(this.dashboard.widgets);
        this.dashboard.widgets.forEach(widget => this.loadWidget(widget, !!refreshRate));
        this.filters = []; // TODO: implement (@/services/dashboard.js:collectDashboardFilters)
        this.filtersOnChange = (allFilters) => {
          this.filters = allFilters;
          $scope.$applyAsync();
        };

        this.extractGlobalParameters();
      }).catch((error) => {
        throw new PromiseRejectionError(error);
      });

      if (refreshRate) {
        $timeout(this.refreshDashboard, refreshRate * 1000.0);
      }
    };

    this.refreshDashboard();

    this.getQueryResultsErrorData = () => {
      const dashboardErrors = _.map(this.dashboard.widgets, (widget) => {
        // get result
        const result = widget.getQueryResult();
        if (!result) {
          return null;
        }

        // get error data
        const errorData = result.getErrorData();
        if (_.isEmpty(errorData)) {
          return null;
        }

        // dashboard params only
        const localParamNames = _.map(widget.getLocalParameters(), p => p.name);
        const filtered = _.omit(errorData.parameters, localParamNames);

        return filtered;
      });

      const merged = _.assign({}, ...dashboardErrors);
      const errorData = _.isEmpty(merged) ? null : { parameters: merged };

      // avoiding Angular infdig (ANGULAR_REMOVE_ME)
      if (!_.isEqual(currentQueryResultsErrorData, errorData)) {
        currentQueryResultsErrorData = errorData;
      }

      return currentQueryResultsErrorData;
    };
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
