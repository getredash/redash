import { find, map, clone } from 'lodash';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';
import { routesToAngularRoutes } from '@/lib/utils';
import { Query } from '@/services/query';
import { DataSource, SCHEMA_NOT_SUPPORTED } from '@/services/data-source';
import notification from '@/services/notification';
import recordEvent from '@/services/recordEvent';

import QueryPageHeader from './components/QueryPageHeader';
import SchemaBrowser from './components/SchemaBrowser';

import './query-source.less';

function getSchema(dataSource, refresh = undefined) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  return dataSource.getSchema(refresh)
    .then((data) => {
      if (data.schema) {
        return data.schema;
      } else if (data.error.code === SCHEMA_NOT_SUPPORTED) {
        return [];
      }
      return Promise.reject(new Error('Schema refresh failed.'));
    })
    .catch(() => {
      notification.error('Schema refresh failed.', 'Please try again later.');
      return Promise.resolve([]);
    });
}

function QuerySource(props) {
  const [query, setQuery] = useState(props.query);
  const [dataSources, setDataSources] = useState([]);
  const dataSource = useMemo(() => (find(dataSources, { id: query.data_source_id }) || null), [query, dataSources]);
  const [schema, setSchema] = useState([]);

  useEffect(() => {
    recordEvent('view_source', 'query', query.id);

    let isCancelled = false;
    DataSource.query().$promise.then((data) => {
      if (!isCancelled) {
        setDataSources(data);
      }
    });

    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    getSchema(dataSource).then((data) => {
      if (!isCancelled) {
        setSchema(data);
      }
    });

    return () => { isCancelled = true; };
  }, [dataSource]);

  const handleDataSourceChange = useCallback((dataSourceId) => {
    const newQuery = clone(query);
    newQuery.data_source_id = dataSourceId;
    setQuery(newQuery);
  }, [query]);

  return (
    <div className="query-page-wrapper">
      <div className="container">
        <QueryPageHeader query={query} sourceMode />
      </div>
      <main className="query-fullscreen">
        <nav>
          <div className="editor__left__data-source">
            <Select
              className="w-100"
              value={query.data_source_id}
              disabled={!query.can_edit}
              onChange={handleDataSourceChange}
            >
              {map(dataSources, ds => (
                <Select.Option key={`ds-${ds.id}`} value={ds.id}>
                  <img src={`/static/images/db-logos/${ds.type}.png`} width="20" alt={ds.name} />
                  <span>{ds.name}</span>
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="editor__left__schema">
            <SchemaBrowser schema={schema} onRefresh={() => console.log('Should refresh schema')} />
          </div>
        </nav>

        <div className="content">
          <div className="flex-fill p-relative">
            <div className="p-absolute d-flex flex-column p-l-15 p-r-15" style={{ left: 0, top: 0, right: 0, bottom: 0, overflow: 'auto' }}>
              <div className="row editor" style={{ minHeight: '11px', maxHeight: '70vh' }}>
                Editor
              </div>
              <section className="flex-fill p-relative t-body query-visualizations-wrapper">
                Visualizations
              </section>
            </div>
          </div>
        </div>
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
      layout: 'fixed',
      reloadOnSearch: false,
      template: '<page-query-source ng-if="$resolve.query" query="$resolve.query"></page-query-source>',
      resolve: {
        query: () => Query.newQuery(),
      },
    }),
    ...routesToAngularRoutes([{
      path: '/queries/:queryId/source2',
    }], {
      layout: 'fixed',
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
