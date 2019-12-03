import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { routesToAngularRoutes } from '@/lib/utils';
import { Query } from '@/services/query';

import QueryPageHeader from './components/QueryPageHeader';

function QuerySource({ query }) {
  return (
    <div className="query-page-wrapper">
      <div className="container">
        <QueryPageHeader query={query} sourceMode />
      </div>
      <main className="query-fullscreen">
        Content
      </main>
    </div>
  );
}

QuerySource.propTypes = {
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default function init(ngModule) {
  ngModule.component('pageQuerySource', react2angular(QuerySource));

  return {
    ...routesToAngularRoutes([{
      path: '/queries/new2',
    }], {
      reloadOnSearch: false,
      template: '<page-query-source ng-if="$resolve.query" query="$resolve.query"></page-query-source>',
      resolve: {
        query: () => Query.newQuery(),
      },
    }),
    ...routesToAngularRoutes([{
      path: '/queries/:queryId/source2',
    }], {
      reloadOnSearch: false,
      template: '<page-query-source ng-if="$resolve.query" query="$resolve.query"></page-query-source>',
      resolve: {
        query: ($route) => {
          'ngInject';

          return Query.get({ id: $route.current.params.queryId }).$promise;
        },
      },
    }),
  };
}

init.init = true;
