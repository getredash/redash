import { find } from 'lodash';
import moment from 'moment';
import queryStringParameters from '@/services/query-string';
import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './visualization-embed.html';
import PromiseRejectionError from '@/lib/promise-rejection-error';

const VisualizationEmbed = {
  template,
  controller($http, $q, $routeParams, Auth, Query, QueryResult, $exceptionHandler) {
    'ngInject';

    document.querySelector('body').classList.add('headless');
    const visualizationId = parseInt($routeParams.visualizationId, 10);
    this.showQueryDescription = $routeParams.showDescription;
    this.logoUrl = logoUrl;

    this.apiKey = $routeParams.api_key;
    Auth.setApiKey(this.apiKey);
    Auth.loadConfig().then(() => {
      const queryId = $routeParams.queryId;

      const query = $http.get(`api/queries/${queryId}`).then(response => response.data);
      const queryResult = $http.post(`api/queries/${queryId}/results`, {
        parameters: queryStringParameters(),
      }).then(response => response.data, (error) => {
        if (error.status === 400) {
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

  ngModule.config(($routeProvider) => {
    $routeProvider.when('/embed/query/:queryId/visualization/:visualizationId', {
      template: '<visualization-embed></visualization-embed>',
    });
  });
}

init.init = true;
