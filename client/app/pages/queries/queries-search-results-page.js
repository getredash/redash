import moment from 'moment';
import { isString } from 'underscore';

import { Paginator } from '@/lib/pagination';
import template from './queries-search-results-page.html';

function QuerySearchCtrl($location, $filter, currentUser, Events, Query) {
  this.term = $location.search().q;
  this.paginator = new Paginator([], { itemsPerPage: 20 });

  this.tabs = [
    { path: 'queries', name: 'All Queries', isActive: path => path === '/queries' },
    { name: 'My Queries', path: 'queries/my' },
    { name: 'Search', path: 'queries/search' },
  ];

  Query.search({ q: this.term, include_drafts: true }, (results) => {
    const queries = results.map((query) => {
      query.created_at = moment(query.created_at);
      return query;
    });

    this.paginator.updateRows(queries);
  });

  this.createdAtSort = row => row.created_at.valueOf();
  this.createdBySort = row => row.user.name;
  this.scheduleSort = (row) => {
    if (!row.schedule) {
      return null;
    }
    if (row.schedule.match(/\d\d:\d\d/) !== null) {
      const parts = row.schedule.split(':');
      const localTime = moment.utc()
        .hour(parts[0])
        .minute(parts[1]);
      return localTime.valueOf();
    }
    return parseInt(row.schedule, 10);
  };

  this.search = () => {
    if (!isString(this.term) || this.term.trim() === '') {
      this.paginator.updateRows([]);
    } else {
      $location.search({ q: this.term });
    }
  };

  Events.record('search', 'query', '', { term: this.term });
}

export default function init(ngModule) {
  ngModule.component('queriesSearchResultsPage', {
    template,
    controller: QuerySearchCtrl,
  });

  return {
    '/queries/search': {
      template: '<queries-search-results-page></queries-search-results-page>',
      reloadOnSearch: true,
      title: 'Queries Search',
    },
  };
}
