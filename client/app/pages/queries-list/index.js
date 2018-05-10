import moment from 'moment';
import _ from 'underscore';

import { LivePaginator } from '@/lib/pagination';
import template from './queries-list.html';

class QueriesListCtrl {
  constructor($scope, $location, Query, currentUser) {
    const page = parseInt($location.search().page || 1, 10);

    this.defaultOptions = {};

    // use $parent because we're using a component as route target instead of controller;
    // $parent refers to scope created for the page by router
    this.resource = $scope.$parent.$resolve.resource;
    this.currentPage = $scope.$parent.$resolve.currentPage;

    this.currentUser = currentUser;

    this.showEmptyState = false;

    const self = this;

    function queriesFetcher(requestedPage, itemsPerPage, paginator) {
      $location.search('page', requestedPage);

      const request = Object.assign(
        {}, self.defaultOptions,
        { page: requestedPage, page_size: itemsPerPage },
      );

      return self.resource(request).$promise.then((data) => {
        const rows = data.results.map((query) => {
          query.created_at = moment(query.created_at);
          query.retrieved_at = moment(query.retrieved_at);
          return new Query(query);
        });

        paginator.updateRows(rows, data.count);

        self.showEmptyState = data.count === 0;
      });
    }

    this.navigateTo = url => $location.url(url);

    this.paginator = new LivePaginator(queriesFetcher, { page });
  }
}

export default function init(ngModule) {
  ngModule.component('pageQueriesList', {
    template,
    controller: QueriesListCtrl,
  });

  const route = {
    template: '<page-queries-list></page-queries-list>',
    reloadOnSearch: false,
  };

  return {
    '/queries': _.extend({
      title: 'Queries',
      resolve: {
        currentPage: () => 'all',
        resource(Query) {
          'ngInject';

          return Query.query.bind(Query);
        },
      },
    }, route),
    '/queries/my': _.extend({
      title: 'My Queries',
      resolve: {
        currentPage: () => 'my',
        resource: (Query) => {
          'ngInject';

          return Query.myQueries.bind(Query);
        },
      },
    }, route),
    '/queries/favorite': _.extend({
      title: 'Favorite Queries',
      resolve: {
        currentPage: () => 'favorites',
        resource: (Query, $q) => {
          'ngInject';

          return (request) => {
            const result = {
              results: [],
            };
            result.$promise = $q((resolve, reject) => {
              // convert plain array to paginator
              Query.favorites(request).$promise
                .then((data) => {
                  result.count = data.length;
                  result.results = data;
                  result.page = 1;
                  result.page_size = data.length;

                  resolve(result);
                })
                .catch(reject);
            });
            return result;
          };
        },
      },
    }, route),
  };
}
