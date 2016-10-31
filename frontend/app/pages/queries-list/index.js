import moment from 'moment';
import template from './queries_list.html';

class QueriesListCtrl {
  constructor($scope, $location, NgTableParams, Query) {
    const page = parseInt($location.search().page || 1, 10);
    const count = 25;

    this.defaultOptions = {};

    const self = this;

    this.tableParams = new NgTableParams({ page, count }, {
      getData(params) {
        const options = params.url();

        $location.search('page', options.page);

        const request = Object.assign({}, self.defaultOptions, { page: options.page, page_size: options.count });
        return self.resource(request).$promise.then((data) => {
          params.total(data.count);
          return data.results.map((query) => {
            query.created_at = moment(query.created_at);
            query.retrieved_at = moment(query.retrieved_at);
            return query;
          });
        });
      },
    });

    switch ($location.path()) {
      case '/queries':
        // $scope.$parent.pageTitle = 'Queries';
        // page title
        this.resource = Query.query;
        break;
      case '/queries/drafts':
        // $scope.$parent.pageTitle = 'Drafts';
        this.resource = Query.myQueries;
        this.defaultOptions.drafts = true;
        break;
      case '/queries/my':
        // $scope.$parent.pageTitle = 'My Queries';
        this.resource = Query.myQueries;
        break;
      default:
        break;
    }

    this.tabs = [
      { name: 'My Queries', path: 'queries/my' },
      { path: 'queries', name: 'All Queries', isActive: path => path === '/queries' },
      { path: 'queries/drafts', name: 'Drafts' },
    ];
  }
}

export default function (ngModule) {
  ngModule.component('pageQueriesList', {
    template,
    controller: QueriesListCtrl,
  });

  const route = {
    template: '<page-queries-list></page-queries-list>',
    reloadOnSearch: false,
  };

  return {
    '/queries': route,
    '/queries/my': route,
    '/queries/drafts': route,
  };
}
