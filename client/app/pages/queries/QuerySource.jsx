import { isObject, filter, find, map, clone, includes, pick, omit, extend } from "lodash";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";
import Select from "antd/lib/select";
import Modal from "antd/lib/modal";
import { routesToAngularRoutes } from "@/lib/utils";
import { Query } from "@/services/query";
import { DataSource, SCHEMA_NOT_SUPPORTED } from "@/services/data-source";
import notification from "@/services/notification";
import recordEvent from "@/services/recordEvent";

import QueryPageHeader from "./components/QueryPageHeader";
import SchemaBrowser from "./components/SchemaBrowser";

import "./query-source.less";

function getSchema(dataSource, refresh = undefined) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  return dataSource
    .getSchema(refresh)
    .then(data => {
      if (data.schema) {
        return data.schema;
      } else if (data.error.code === SCHEMA_NOT_SUPPORTED) {
        return [];
      }
      return Promise.reject(new Error("Schema refresh failed."));
    })
    .catch(() => {
      notification.error("Schema refresh failed.", "Please try again later.");
      return Promise.resolve([]);
    });
}

function chooseDataSourceId(dataSourceIds, availableDataSources) {
  dataSourceIds = map(dataSourceIds, v => parseInt(v, 10));
  availableDataSources = map(availableDataSources, ds => ds.id);
  return find(dataSourceIds, id => includes(availableDataSources, id)) || null;
}

function confirmOverwrite() {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      title: "Overwrite Query",
      content: (
        <React.Fragment>
          <div className="m-b-5">It seems like the query has been modified by another user.</div>
          <div>Are you sure you want to overwrite the query with your version?</div>
        </React.Fragment>
      ),
      okText: "Overwrite",
      okType: "danger",
      onOk: () => {
        resolve();
      },
      onCancel: () => {
        reject();
      },
      maskClosable: true,
      autoFocusButton: null,
    });
  });
}

function saveQuery(query, data, options) {
  query = clone(query);
  options = {
    successMessage: "Query saved",
    errorMessage: "Query could not be saved",
    ...options,
  };

  if (isObject(data)) {
    extend(query, data);
    // Don't save new query with partial data
    if (query.isNew()) {
      return Promise.resolve(query);
    }
    data = { ...data, id: query.id, version: query.version };
  } else {
    data = pick(query, [
      "id",
      "version",
      "schedule",
      "query",
      "description",
      "name",
      "data_source_id",
      "options",
      "latest_query_data_id",
      "is_draft",
    ]);
  }

  // omit pendingValue before saving
  if (isObject(data.options) && data.options.parameters) {
    data.options = {
      ...data.options,
      parameters: map(data.options.parameters, p => p.toSaveableObject()),
    };
  }

  const promise = Query.save(data).$promise;

  return promise
    .catch(error => {
      if (error.status === 409) {
        const errorMessage = "It seems like the query has been modified by another user.";

        if (query.can_edit) {
          return confirmOverwrite().then(() => Query.save(omit(data, ["version"])).$promise);
        } else {
          notification.error(
            "Changes not saved",
            `${errorMessage} Please copy/backup your changes and reload this page.`,
            { duration: null }
          );
        }
      } else {
        notification.error(options.errorMessage);
      }
      return Promise.reject(new Error("Changes not saved"));
    })
    .then(updatedQuery => {
      notification.success(options.successMessage);
      // Here we mutate query that might be already used as state. But we change only `version` field
      // which is not needed to update DOM, so it's safe
      query.version = updatedQuery.version;
      return query;
    });
}

function QuerySource(props) {
  const [query, setQuery] = useState(props.query);
  const [allDataSources, setAllDataSources] = useState([]);
  const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
  const dataSources = useMemo(() => filter(allDataSources, ds => !ds.view_only || ds.id === query.data_source_id), [
    allDataSources,
    query.data_source_id,
  ]);
  const dataSource = useMemo(() => find(dataSources, { id: query.data_source_id }) || null, [query, dataSources]);
  const [schema, setSchema] = useState([]);
  const refreshSchemaTokenRef = useRef(null);

  useEffect(() => {
    let cancelDataSourceLoading = false;
    DataSource.query().$promise.then(data => {
      if (!cancelDataSourceLoading) {
        setDataSourcesLoaded(true);
        setAllDataSources(data);
      }
    });

    return () => {
      // cancel pending operations
      cancelDataSourceLoading = true;
      refreshSchemaTokenRef.current = null;
    };
  }, []);

  const reloadSchema = useCallback(
    (refresh = undefined) => {
      const refreshToken = Math.random()
        .toString(36)
        .substr(2);
      refreshSchemaTokenRef.current = refreshToken;
      getSchema(dataSource, refresh).then(data => {
        if (refreshSchemaTokenRef.current === refreshToken) {
          setSchema(data);
        }
      });
    },
    [dataSource]
  );

  useEffect(() => {
    reloadSchema();
  }, [reloadSchema]);

  useEffect(() => {
    recordEvent("view_source", "query", query.id);
  }, [query.id]);

  const handleDataSourceChange = useCallback(
    dataSourceId => {
      if (dataSourceId) {
        try {
          localStorage.setItem("lastSelectedDataSourceId", dataSourceId);
        } catch (e) {
          // `localStorage.setItem` may throw exception if there are no enough space - in this case it could be ignored
        }
      }
      if (query.data_source_id !== dataSourceId) {
        recordEvent("update_data_source", "query", query.id, { dataSourceId });
        const newQuery = clone(query);
        newQuery.data_source_id = dataSourceId;
        newQuery.latest_query_data = null;
        newQuery.latest_query_data_id = null;
        setQuery(newQuery);
        // TODO: Save if not new
      }
    },
    [query]
  );

  useEffect(() => {
    // choose data source id for new queries
    if (dataSourcesLoaded && query.isNew()) {
      const firstDataSourceId = dataSources.length > 0 ? dataSources[0].id : null;
      handleDataSourceChange(
        chooseDataSourceId(
          [query.data_source_id, localStorage.getItem("lastSelectedDataSourceId"), firstDataSourceId],
          dataSources
        )
      );
    }
  }, [query, dataSourcesLoaded, dataSources, handleDataSourceChange]);

  const handleQueryChange = useCallback(
    (changes = null, options = {}) => {
      saveQuery(query, changes, options).then(setQuery);
    },
    [query]
  );

  return (
    <div className="query-page-wrapper">
      <div className="container">
        <QueryPageHeader query={query} sourceMode onChange={handleQueryChange} />
      </div>
      <main className="query-fullscreen">
        <nav>
          <div className="editor__left__data-source">
            <Select
              className="w-100"
              placeholder="Choose data source..."
              value={dataSource ? dataSource.id : undefined}
              disabled={!query.can_edit || !dataSourcesLoaded || dataSources.length === 0}
              loading={!dataSourcesLoaded}
              optionFilterProp="data-name"
              showSearch
              onChange={handleDataSourceChange}>
              {map(dataSources, ds => (
                <Select.Option key={`ds-${ds.id}`} value={ds.id} data-name={ds.name}>
                  <img src={`/static/images/db-logos/${ds.type}.png`} width="20" alt={ds.name} />
                  <span>{ds.name}</span>
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="editor__left__schema">
            <SchemaBrowser schema={schema} onRefresh={() => reloadSchema(true)} />
          </div>
        </nav>

        <div className="content">
          <div className="flex-fill p-relative">
            <div
              className="p-absolute d-flex flex-column p-l-15 p-r-15"
              style={{ left: 0, top: 0, right: 0, bottom: 0, overflow: "auto" }}>
              <div className="row editor" style={{ minHeight: "11px", maxHeight: "70vh" }}>
                Editor
              </div>
              <section className="flex-fill p-relative t-body query-visualizations-wrapper">Visualizations</section>
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
  ngModule.component("pageQuerySource", react2angular(QuerySource));

  return {
    ...routesToAngularRoutes(
      [
        {
          path: "/queries/new2",
        },
      ],
      {
        layout: "fixed",
        reloadOnSearch: false,
        template: '<page-query-source ng-if="$resolve.query" query="$resolve.query"></page-query-source>',
        resolve: {
          query: () => Query.newQuery(),
        },
      }
    ),
    ...routesToAngularRoutes(
      [
        {
          path: "/queries/:queryId/source2",
        },
      ],
      {
        layout: "fixed",
        reloadOnSearch: false,
        template: '<page-query-source ng-if="$resolve.query" query="$resolve.query"></page-query-source>',
        resolve: {
          query: $route => {
            "ngInject";

            return Query.get({ id: $route.current.params.queryId }).$promise;
          },
        },
      }
    ),
  };
}

init.init = true;
