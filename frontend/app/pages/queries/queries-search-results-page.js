import moment from 'moment';
import { isString } from 'underscore';

import { Paginator } from '../../utils';
import template from './queries-search-results-page.html';

function QuerySearchCtrl($location, $filter, currentUser, Events, Query) {
  // $scope.$parent.pageTitle = 'Queries Search';

  this.term = $location.search().q;
  this.paginator = new Paginator([], { itemsPerPage: 20 });

  Query.search({ q: this.term }, (results) => {
    const queries = results.map((query) => {
      query.created_at = moment(query.created_at);
      return query;
    });

    this.paginator.updateRows(queries);
  });

  this.search = () => {
    if (!isString(this.term) || this.term.trim() === '') {
      this.paginator.updateRows([]);
    } else {
      $location.search({ q: this.term });
    }
  };

  Events.record(currentUser, 'search', 'query', '', { term: this.term });
}

export default function (ngModule) {
  ngModule.component('queriesSearchResultsPage', {
    template,
    controller: QuerySearchCtrl,
  });

  return {
    '/queries/search': {
      template: '<queries-search-results-page></queries-search-results-page>',
      reloadOnSearch: true,
    },
  };
}
