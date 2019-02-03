import moment from 'moment';

import { buildListRoutes, ListCtrl } from '@/lib/list-ctrl';
import template from './queries-list.html';
import './queries-list.css';


class QueriesListCtrl extends ListCtrl {
  constructor($scope, $location, $route, currentUser, clientConfig, Query) {
    super($scope, $location, $route, currentUser, clientConfig);
    this.Type = Query;
    this.showMyQueries = currentUser.hasPermission('create_query');
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map((query) => {
      query.created_at = moment(query.created_at);
      query.retrieved_at = moment(query.retrieved_at);
      return new this.Type(query);
    });

    this.paginator.updateRows(rows, data.count);

    if (data.count === 0) {
      if (this.isInSearchMode()) {
        this.emptyType = 'search';
      } else if (this.selectedTags.size > 0) {
        this.emptyType = 'tags';
      } else if (this.currentPage === 'favorites') {
        this.emptyType = 'favorites';
      } else if (this.currentPage === 'my') {
        this.emptyType = 'my';
      } else if (this.currentPage === 'archive') {
        this.emptyType = 'archive';
      } else {
        this.emptyType = 'default';
      }
    }
    this.showEmptyState = data.count === 0;
  }
}

export default function init(ngModule) {
  ngModule.component('pageQueriesList', {
    template,
    controller: QueriesListCtrl,
  });

  const routes = [
    {
      page: 'all',
      title: 'All Queries',
      path: '/queries',
    },
    {
      page: 'my',
      title: 'My Queries',
      path: '/queries/my',
    },
    {
      page: 'favorites',
      title: 'Favorite Queries',
      path: '/queries/favorites',
    },
    {
      page: 'archive',
      title: 'Archived Queries',
      path: '/queries/archive',
    },
  ];
  return buildListRoutes('query', routes, '<page-queries-list></page-queries-list>');
}

init.init = true;
