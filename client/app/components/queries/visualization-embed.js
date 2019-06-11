import { find } from 'lodash';
import moment from 'moment';
import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './visualization-embed.html';

const VisualizationEmbed = {
  template,
  bindings: {
    query: '<',
  },
  controller($routeParams) {
    'ngInject';

    this.refreshQueryResults = () => {
      this.loading = true;
      this.error = null;
      this.refreshStartedAt = moment();
      this.query
        .getQueryResultPromise()
        .then((result) => {
          this.loading = false;
          this.queryResult = result;
        })
        .catch((error) => {
          this.loading = false;
          this.error = error.getError();
        });
    };

    const visualizationId = parseInt($routeParams.visualizationId, 10);
    this.visualization = find(this.query.visualizations, visualization => visualization.id === visualizationId);
    this.showQueryDescription = $routeParams.showDescription;
    this.logoUrl = logoUrl;
    this.apiKey = $routeParams.api_key;

    document.querySelector('body').classList.add('headless');

    if (this.query.is_safe) {
      this.refreshQueryResults();
    } else {
      this.error = "Can't embed queries with text parameters.";
    }
  },
};

export default function init(ngModule) {
  ngModule.component('visualizationEmbed', VisualizationEmbed);

  function loadSession($route, Auth) {
    const apiKey = $route.current.params.api_key;
    Auth.setApiKey(apiKey);
    return Auth.loadConfig();
  }

  function loadQuery($route, Auth, Query) {
    'ngInject';

    return loadSession($route, Auth).then(() => Query.get({ id: $route.current.params.queryId }).$promise);
  }

  ngModule.config(($routeProvider) => {
    $routeProvider.when('/embed/query/:queryId/visualization/:visualizationId', {
      resolve: {
        query: loadQuery,
      },
      reloadOnSearch: false,
      template: '<visualization-embed query="$resolve.query"></visualization-embed>',
    });
  });
}

init.init = true;
