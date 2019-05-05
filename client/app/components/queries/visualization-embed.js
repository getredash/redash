import { find } from 'lodash';
import moment from 'moment';
import queryStringParameters from '@/services/query-string';
import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './visualization-embed.html';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import notification from '@/services/notification';

const VisualizationEmbed = {
  template,
  controller($http, $q, $routeParams, Query, QueryResult, $exceptionHandler) {
    'ngInject';

    document.querySelector('body').classList.add('headless');
    const visualizationId = parseInt($routeParams.visualizationId, 10);
    this.showQueryDescription = $routeParams.showDescription;
    this.logoUrl = logoUrl;

    const queryId = $routeParams.queryId;

    const query = $http.get(`api/queries/${queryId}`).then(response => response.data);
    const queryResult = $http.post(`api/queries/${queryId}/results`, {
      parameters: queryStringParameters(),
    }).then(response => response.data, (error) => {
      if (error.status === 400) {
        if (error.data.job) {
          notification.error(error.data.job.error);
        }

        return {};
      }

      // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
      if (error.status && error.data) {
        error = new PromiseRejectionError(error);
      }

      $exceptionHandler(error);
    });

    $q.all([query, queryResult]).then((data) => {
      this.query = new Query(data[0]);
      this.queryResult = new QueryResult(data[1]);
      this.visualization =
        find(this.query.visualizations, visualization => visualization.id === visualizationId);
    });

    this.refreshQueryResults = () => {
      this.loading = true;
      this.refreshStartedAt = moment();
      this.query.getQueryResultPromise()
        .then((result) => {
          this.loading = false;
          this.queryResult = result;
        })
        .catch((error) => {
          this.loading = false;
          this.queryResult = error;
        });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('visualizationEmbed', VisualizationEmbed);

  function loadSession($route, Auth) {
    'ngInject';

    const apiKey = $route.current.params.api_key;
    Auth.setApiKey(apiKey);
    return Auth.loadConfig();
  }

  ngModule.config(($routeProvider) => {
    $routeProvider.when('/embed/query/:queryId/visualization/:visualizationId', {
      resolve: {
        session: loadSession,
      },
      reloadOnSearch: false,
      template: '<visualization-embed></visualization-embed>',
    });
  });
}

init.init = true;
