import moment from 'moment';
import { isString } from 'underscore';
import startsWith from 'underscore.string/startsWith';

import { LivePaginator } from '@/lib/pagination';
import template from './queries-list.html';


class QueriesListCtrl {
  constructor($location, $log, $route, Title, Query) {
    const page = parseInt($location.search().page || 1, 10);
    const orderSeparator = '-';
    const pageOrder = $location.search().order || 'created_at';
    const pageOrderReverse = startsWith(pageOrder, orderSeparator);
    this.showEmptyState = false;
    this.showDrafts = false;
    this.pageSize = parseInt($location.search().page_size || 20, 10);
    this.pageSizeOptions = [5, 10, 20, 50, 100];
    this.searchTerm = $location.search().search || '';
    this.oldSearchTerm = $location.search().q;
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
      // Redirect to the real search view.
      // TODO: check if that really always works.
      case '/queries/search':
        window.location.replace('/queries?q=' + this.oldSearchTerm);
        break;
      default:
        break;
    }

    const setSearchOrClear = (name, value) => {
      if (value) {
        $location.search(name, value);
      } else {
        $location.search(name, undefined);
      }
    };

    function queriesFetcher(requestedPage, itemsPerPage, orderByField, orderByReverse, params, paginator) {
      $location.search('page', requestedPage);
      $location.search('page_size', itemsPerPage);
      if (orderByReverse && !startsWith(orderByField, orderSeparator)) {
        orderByField = orderSeparator + orderByField;
      }
      setSearchOrClear('order', orderByField);
      setSearchOrClear('search', params.searchTerm);
      setSearchOrClear('drafts', params.showDrafts);

      const request = Object.assign(
        {}, self.defaultOptions,
        {
          page: requestedPage,
          page_size: itemsPerPage,
          order: orderByField,
          search: params.searchTerm,
          drafts: params.showDrafts,
        },
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

    this.paginator = new LivePaginator(
      queriesFetcher,
      {
        page,
        itemsPerPage: this.pageSize,
        orderByField: pageOrder,
        orderByReverse: pageOrderReverse,
        params: this.parameters,
      },
    );

    this.parameters = () => ({
      searchTerm: this.searchTerm,
      showDrafts: this.showDrafts,
    });

    this.tabs = [
      { path: 'queries', name: 'All Queries', isActive: path => path === '/queries' },
      { name: 'My Queries', path: 'queries/my' },
    ];

    this.searchUsed = () => this.searchTerm !== undefined || this.searchTerm !== '';

    this.hasResults = () => this.paginator.getPageRows() !== undefined &&
      this.paginator.getPageRows().length > 0;

    this.showEmptyState = () => !this.hasResults() && !this.searchUsed();

    this.showDraftsCheckbox = () => $location.path() !== '/queries/my';

    this.clearSearch = () => {
      this.searchTerm = '';
      this.update();
    };

    this.update = () => {
      if (!isString(this.searchTerm) || this.searchTerm.trim() === '') {
        this.searchTerm = '';
      }
      this.paginator.itemsPerPage = this.pageSize;
      this.paginator.params = this.parameters();
      this.paginator.fetch(page);
    };
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
    // just for backward-compatible routes
    '/queries/search': {
      template: '<page-queries-list></page-queries-list>',
      reloadOnSearch: false,
    },
  };
}
