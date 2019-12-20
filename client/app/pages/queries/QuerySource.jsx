import { extend, filter, find, map, clone, includes, reduce } from "lodash";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";
import { useDebouncedCallback } from "use-debounce";
import Select from "antd/lib/select";
import { Parameters } from "@/components/Parameters";
import { EditVisualizationButton } from "@/components/EditVisualizationButton";
import { QueryControlDropdown } from "@/components/EditVisualizationButton/QueryControlDropdown";
import QueryEditor from "@/components/queries/QueryEditor";
import { TimeAgo } from "@/components/TimeAgo";
import EmbedQueryDialog from "@/components/queries/EmbedQueryDialog";
import AddToDashboardDialog from "@/components/queries/AddToDashboardDialog";
import EditVisualizationDialog from "@/visualizations/EditVisualizationDialog";
import { routesToAngularRoutes } from "@/lib/utils";
import useQueryResult from "@/lib/hooks/useQueryResult";
import useForceUpdate from "@/lib/hooks/useForceUpdate";
import { durationHumanize, prettySize } from "@/filters";
import { Query } from "@/services/query";
import { DataSource, SCHEMA_NOT_SUPPORTED } from "@/services/data-source";
import notification from "@/services/notification";
import recordEvent from "@/services/recordEvent";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";
import localOptions from "@/lib/localOptions";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import SchemaBrowser from "./components/SchemaBrowser";
import useVisualizationTabHandler from "./utils/useVisualizationTabHandler";
import { updateQuery } from "./utils";

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

function QuerySource(props) {
  const forceUpdate = useForceUpdate();

  const [query, setQuery] = useState(props.query);
  const [originalQuerySource, setOriginalQuerySource] = useState(props.query.query);
  const [allDataSources, setAllDataSources] = useState([]);
  const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
  const dataSources = useMemo(() => filter(allDataSources, ds => !ds.view_only || ds.id === query.data_source_id), [
    allDataSources,
    query.data_source_id,
  ]);
  const dataSource = useMemo(() => find(dataSources, { id: query.data_source_id }) || null, [query, dataSources]);
  const [schema, setSchema] = useState([]);
  const refreshSchemaTokenRef = useRef(null);
  const [selectedTab, setSelectedTab] = useVisualizationTabHandler(query.visualizations);
  const parameters = useMemo(() => query.getParametersDefs(), [query]);

  const queryResult = useMemo(() => query.getQueryResult(), [query]);
  const queryResultData = useQueryResult(queryResult);

  const editorRef = useRef(null);
  const autocompleteAvailable = useMemo(() => {
    const tokensCount = reduce(schema, (totalLength, table) => totalLength + table.columns.length, 0);
    return tokensCount <= 5000;
  }, [schema]);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(localOptions.get("liveAutocomplete", true));
  const [selectedText, setSelectedText] = useState(null);

  const handleSelectionChange = useCallback(text => {
    setSelectedText(text);
  }, []);

  const toggleAutocomplete = useCallback(state => {
    setAutocompleteEnabled(state);
    localOptions.set("liveAutocomplete", state);
  }, []);

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

  const [handleQueryEditorChange] = useDebouncedCallback(queryText => {
    setQuery(extend(clone(query), { query: queryText }));
  }, 200);

  const formatQuery = useCallback(() => {
    Query.format(dataSource.syntax || "sql", query.query)
      .then(queryText => {
        setQuery(extend(clone(query), { query: queryText }));
      })
      .catch(error => notification.error(error));
  }, [dataSource, query]);

  useEffect(() => {
    reloadSchema();
  }, [reloadSchema]);

  useEffect(() => {
    recordEvent("view_source", "query", query.id);
  }, [query.id]);

  useEffect(() => {
    document.title = query.name;
  }, [query.name]);

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
        newQuery.latest_query_data_id = null;
        newQuery.latest_query_data = null;
        setQuery(newQuery);
        updateQuery(
          newQuery,
          {
            data_source_id: newQuery.data_source_id,
            latest_query_data_id: newQuery.latest_query_data_id,
          },
          { successMessage: null } // show message only on error
        ).then(setQuery);
      }
    },
    [query]
  );

  const saveQuery = useCallback(() => {
    updateQuery(query).then(updatedQuery => {
      setQuery(updatedQuery);
      setOriginalQuerySource(updatedQuery.query);
    });
  }, [query]);

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

  const queryExecuting = false; // TODO: Replace with real value

  const openAddToDashboardDialog = useCallback(
    visualizationId => {
      const visualization = find(query.visualizations, { id: visualizationId });
      AddToDashboardDialog.showModal({ visualization });
    },
    [query]
  );

  const openEmbedDialog = useCallback(
    (unused, visualizationId) => {
      const visualization = find(query.visualizations, { id: visualizationId });
      EmbedQueryDialog.showModal({ query, visualization });
    },
    [query]
  );

  const openEditVisualizationDialog = useCallback(
    visualizationId => {
      // TODO: New queries should be saved (and URL updated), and only then this dialog should appear
      const visualization = find(query.visualizations, { id: visualizationId });
      EditVisualizationDialog.showModal({
        query,
        visualization,
        queryResult,
      }).result.then(visualization => {
        setSelectedTab(visualization.id);
        forceUpdate();
      });
    },
    [query, queryResult, setSelectedTab, forceUpdate]
  );

  const canExecuteQuery = true; // TODO: Replace with real value
  const isDirty = query.query !== originalQuerySource;

  const modKey = KeyboardShortcuts.modKey;

  return (
    <div className="query-page-wrapper">
      <div className="container">
        <QueryPageHeader query={query} sourceMode onChange={setQuery} />
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
              <div className="row editor resizable" style={{ minHeight: "11px", maxHeight: "70vh" }}>
                <section className="query-editor-wrapper" data-test="QueryEditor">
                  <QueryEditor
                    ref={editorRef}
                    data-executing={queryExecuting ? "true" : null}
                    syntax={dataSource ? dataSource.syntax : null}
                    value={query.query}
                    schema={schema}
                    autocompleteEnabled={autocompleteAvailable && autocompleteEnabled}
                    onChange={handleQueryEditorChange}
                    onSelectionChange={handleSelectionChange}
                  />

                  <QueryEditor.Controls
                    addParameterButtonProps={{
                      title: (
                        <React.Fragment>
                          Add New Parameter (<i>{modKey} + P</i>)
                        </React.Fragment>
                      ),
                      onClick: () => { console.log('addNewParameter'); },
                    }}
                    formatButtonProps={{
                      title: (
                        <React.Fragment>
                          Format Query (<i>{modKey} + Shift + F</i>)
                        </React.Fragment>
                      ),
                      onClick: formatQuery,
                    }}
                    saveButtonProps={
                      query.can_edit && {
                        title: `${modKey} + S`,
                        text: (
                          <React.Fragment>
                            <span className="hidden-xs">Save</span>
                            {isDirty ? "*" : null}
                          </React.Fragment>
                        ),
                        onClick: saveQuery,
                      }
                    }
                    executeButtonProps={{
                      title: `${modKey} + Enter`,
                      disabled: !canExecuteQuery || queryExecuting,
                      onClick: () => { console.log('executeQuery'); },
                      text: <span className="hidden-xs">{selectedText === null ? "Execute" : "Execute Selected"}</span>,
                    }}
                    autocompleteToggleProps={{
                      available: autocompleteAvailable,
                      enabled: autocompleteEnabled,
                      onToggle: toggleAutocomplete,
                    }}
                    dataSourceSelectorProps={dataSource ? {
                      disabled: !query.can_edit,
                      value: dataSource.id,
                      onChange: handleDataSourceChange,
                      options: map(dataSources, ds => ({ value: ds.id, label: ds.name })),
                    } : false}
                  />
                </section>
              </div>

              <section className="flex-fill p-relative t-body query-visualizations-wrapper">
                <div
                  className="d-flex flex-column p-b-15 p-absolute static-position__mobile"
                  style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
                  {query.hasParameters() && (
                    <div className="p-t-15 p-b-5">
                      <Parameters parameters={parameters} />
                    </div>
                  )}
                  <div className="query-alerts">{/* Query Execution Status */}</div>

                  {queryResultData.status === "done" && (
                    <div className="flex-fill p-relative">
                      <div
                        className="d-flex flex-column p-absolute static-position__mobile"
                        style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
                        {queryResultData.log.length > 0 && (
                          <div className="p-10">
                            <p>Log Information:</p>
                            {map(queryResultData.log, (line, index) => (
                              <p key={`log-line-${index}`} className="query-log-line">
                                {line}
                              </p>
                            ))}
                          </div>
                        )}
                        <QueryVisualizationTabs
                          queryResult={queryResult}
                          visualizations={query.visualizations}
                          showNewVisualizationButton={query.can_edit}
                          selectedTab={selectedTab}
                          onChangeTab={setSelectedTab}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
          {queryResultData.status === "done" && (
            <div className="bottom-controller-container">
              <div className="bottom-controller">
                {!query.isNew() && query.can_edit && (
                  <EditVisualizationButton
                    openVisualizationEditor={openEditVisualizationDialog}
                    selectedTab={selectedTab}
                  />
                )}
                <QueryControlDropdown
                  query={query}
                  queryResult={queryResult}
                  queryExecuting={false}
                  showEmbedDialog={openEmbedDialog}
                  embed={false}
                  apiKey={query.api_key}
                  selectedTab={selectedTab}
                  openAddToDashboardForm={openAddToDashboardDialog}
                />

                <span className="query-metadata__bottom">
                  <span className="query-metadata__property">
                    <strong>{queryResultData.rows.length}</strong>
                    {queryResultData.rows.length === 1 ? " row" : " rows"}
                  </span>
                  <span className="query-metadata__property">
                    {!queryExecuting && (
                      <React.Fragment>
                        <strong>{durationHumanize(queryResultData.runtime)}</strong>
                        <span className="hidden-xs"> runtime</span>
                      </React.Fragment>
                    )}
                    {queryExecuting && <span>Running&hellip;</span>}
                  </span>
                  {queryResultData.metadata.data_scanned && (
                    <span className="query-metadata__property">
                      Data Scanned
                      <strong>{prettySize(queryResultData.metadata.data_scanned)}</strong>
                    </span>
                  )}
                </span>

                <div>
                  <span className="query-metadata__property hidden-xs">
                    <span className="hidden-xs">Updated </span>
                    <TimeAgo date={queryResultData.retrievedAt} placeholder="-" />
                  </span>
                </div>
              </div>
            </div>
          )}
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
          path: "/queries-react/new",
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
          path: "/queries-react/:queryId/source",
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
