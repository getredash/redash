import moment from 'moment';

import { LivePaginator } from '@/lib/pagination';
import template from './queries-list.html';

class QueriesListCtrl {
  constructor($location, Title, Query) {
    const page = parseInt($location.search().page || 1, 10);

    this.defaultOptions = {};

    const self = this;

    switch ($location.path()) {
      case '/queries':
        Title.set('Queries');
        this.resource = Query.query;
        break;
      case '/queries/my':
        Title.set('My Queries');
        this.resource = Query.myQueries;
        break;
      default:
        break;
    }

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
          return query;
        });

        paginator.updateRows(rows, data.count);
      });
    }

    this.paginator = new LivePaginator(queriesFetcher, { page });

    this.tabs = [
      { path: 'queries', name: 'All Queries', isActive: path => path === '/queries' },
      { name: 'My Queries', path: 'queries/my' },
      { name: 'Search', path: 'queries/search' },
    ];
  }
}

export default function init(ngModule) {
  ngModule.component('pageQueriesList', {
    template,
    controller: QueriesListCtrl,
  });

  return {
    '/queries': {
      template: '<page-queries-list></page-queries-list>',
      reloadOnSearch: false,
    },
    '/queries/my': {
      template: '<page-queries-list></page-queries-list>',
      reloadOnSearch: false,
    },
  };
}
