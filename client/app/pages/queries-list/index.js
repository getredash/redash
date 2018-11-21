import moment from 'moment';
import { extend } from 'lodash';

import ListCtrl from '@/lib/list-ctrl';
import template from './queries-list.html';
import './queries-list.css';


class QueriesListCtrl extends ListCtrl {
  constructor($scope, $location, currentUser, clientConfig, Query) {
    super($scope, $location, currentUser, clientConfig);
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

  const route = {
    template: '<page-queries-list></page-queries-list>',
    reloadOnSearch: false,
  };

  return {
    '/queries': extend(
      {
        title: 'Queries',
        resolve: {
          currentPage: () => 'all',
          resource(Query) {
            'ngInject';

            return Query.query.bind(Query);
          },
        },
      },
      route,
    ),
    '/queries/my': extend(
      {
        title: 'My Queries',
        resolve: {
          currentPage: () => 'my',
          resource: (Query) => {
            'ngInject';

            return Query.myQueries.bind(Query);
          },
        },
      },
      route,
    ),
    '/queries/favorites': extend(
      {
        title: 'Favorite Queries',
        resolve: {
          currentPage: () => 'favorites',
          resource: (Query) => {
            'ngInject';

            return Query.favorites.bind(Query);
          },
        },
      },
      route,
    ),
    // TODO: setup redirect?
    // '/queries/search': _.extend(
  };
}

init.init = true;

