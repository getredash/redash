import { isEmpty, isArray, filter, find, map, extend, reduce, includes, intersection } from "lodash";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";
import { useDebouncedCallback } from "use-debounce";
import Select from "antd/lib/select";
import { Parameters } from "@/components/Parameters";
import { EditInPlace } from "@/components/EditInPlace";
import { EditVisualizationButton } from "@/components/EditVisualizationButton";
import { QueryControlDropdown } from "@/components/EditVisualizationButton/QueryControlDropdown";
import QueryEditor from "@/components/queries/QueryEditor";
import { TimeAgo } from "@/components/TimeAgo";
import EmbedQueryDialog from "@/components/queries/EmbedQueryDialog";
import AddToDashboardDialog from "@/components/queries/AddToDashboardDialog";
import ScheduleDialog from "@/components/queries/ScheduleDialog";
import EditParameterSettingsDialog from "@/components/EditParameterSettingsDialog";
import { routesToAngularRoutes } from "@/lib/utils";
import { durationHumanize, prettySize } from "@/filters";
import { currentUser } from "@/services/auth";
import { Query } from "@/services/query";
import { DataSource, SCHEMA_NOT_SUPPORTED } from "@/services/data-source";
import notification from "@/services/notification";
import recordEvent from "@/services/recordEvent";
import navigateTo from "@/services/navigateTo";
import { policy } from "@/services/policy";
import { clientConfig } from "@/services/auth";
import localOptions from "@/lib/localOptions";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryMetadata from "./components/QueryMetadata";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import SchemaBrowser from "./components/SchemaBrowser";
import useVisualizationTabHandler from "./utils/useVisualizationTabHandler";
import useQueryExecute from "./utils/useQueryExecute";
import {
  updateQuery,
  updateQueryDescription,
  updateQuerySchedule,
  deleteQueryVisualization,
  addQueryVisualization,
  editQueryVisualization,
} from "./utils";

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
  const [dirtyParameters, setDirtyParameters] = useState(query.getParameters().hasPendingValues());

  const { queryResult, queryResultData, isQueryExecuting, executeQuery, executeAdhocQuery } = useQueryExecute(query);

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
    const updatedDirtyParameters = query.getParameters().hasPendingValues();
    if (updatedDirtyParameters !== dirtyParameters) {
      setDirtyParameters(query.getParameters().hasPendingValues());
    }
  }, [dirtyParameters, parameters, query]);

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
    setQuery(extend(query.clone(), { query: queryText }));
  }, 200);

  const formatQuery = useCallback(() => {
    Query.format(dataSource.syntax || "sql", query.query)
      .then(queryText => {
        setQuery(extend(query.clone(), { query: queryText }));
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
        const newQuery = extend(query.clone(), {
          data_source_id: dataSourceId,
          latest_query_data_id: null,
          latest_query_data: null,
        });
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
      if (updatedQuery.id !== query.id) {
        navigateTo(updatedQuery.getSourceLink());
      }
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

  const editSchedule = useCallback(() => {
    const canScheduleQuery = true; // TODO: Use real value
    if (!query.can_edit || !canScheduleQuery) {
      return;
    }

    const intervals = clientConfig.queryRefreshIntervals;
    const allowedIntervals = policy.getQueryRefreshIntervals();
    const refreshOptions = isArray(allowedIntervals) ? intersection(intervals, allowedIntervals) : intervals;

    ScheduleDialog.showModal({
      schedule: query.schedule,
      refreshOptions,
    }).result.then(schedule => {
      updateQuerySchedule(query, schedule).then(setQuery);
    });
  }, [query]);

  const doUpdateQueryDescription = useCallback(
    description => {
      updateQueryDescription(query, description).then(setQuery);
    },
    [query]
  );

  const openAddNewParameterDialog = useCallback(() => {
    EditParameterSettingsDialog.showModal({
      parameter: {
        title: null,
        name: "",
        type: "text",
        value: null,
      },
      existingParams: map(query.getParameters().get(), p => p.name),
    }).result.then(param => {
      const newQuery = query.clone();
      param = newQuery.getParameters().add(param);
      if (editorRef.current) {
        editorRef.current.paste(param.toQueryTextFragment());
        editorRef.current.focus();
      }
      setQuery(newQuery);
    });
  }, [query]);

  const handleSchemaItemSelect = useCallback(schemaItem => {
    if (editorRef.current) {
      editorRef.current.paste(schemaItem);
    }
  }, []);

  const canExecuteQuery = useMemo(
    () =>
      !isEmpty(query.query) &&
      !isQueryExecuting &&
      !dirtyParameters &&
      (query.is_safe || (currentUser.hasPermission("execute_query") && dataSource && !dataSource.view_only)),
    [isQueryExecuting, dirtyParameters, query, dataSource]
  );
  const isDirty = query.query !== originalQuerySource;

  const doExecuteQuery = useCallback(() => {
    if (!canExecuteQuery) {
      return;
    }
    if (isDirty || !isEmpty(selectedText)) {
      executeAdhocQuery(selectedText);
    } else {
      executeQuery();
    }
  }, [canExecuteQuery, isDirty, selectedText, executeQuery, executeAdhocQuery]);

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
            <SchemaBrowser schema={schema} onRefresh={() => reloadSchema(true)} onItemSelect={handleSchemaItemSelect} />
          </div>

          {!query.isNew() && (
            <div className="query-metadata query-metadata--description">
              <EditInPlace
                editor="textarea"
                isEditable={query.can_edit}
                markdown
                ignoreBlanks={false}
                placeholder="Add description"
                value={query.description}
                onDone={doUpdateQueryDescription}
              />
            </div>
          )}

          {!query.isNew() && <QueryMetadata layout="table" query={query} onEditSchedule={editSchedule} />}
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
                    data-executing={isQueryExecuting ? "true" : null}
                    syntax={dataSource ? dataSource.syntax : null}
                    value={query.query}
                    schema={schema}
                    autocompleteEnabled={autocompleteAvailable && autocompleteEnabled}
                    onChange={handleQueryEditorChange}
                    onSelectionChange={handleSelectionChange}
                  />

                  <QueryEditor.Controls
                    addParameterButtonProps={{
                      title: "Add New Parameter",
                      shortcut: "mod+p",
                      onClick: openAddNewParameterDialog,
                    }}
                    formatButtonProps={{
                      title: "Format Query",
                      shortcut: "mod+shift+f",
                      onClick: formatQuery,
                    }}
                    saveButtonProps={
                      query.can_edit && {
                        text: (
                          <React.Fragment>
                            <span className="hidden-xs">Save</span>
                            {isDirty ? "*" : null}
                          </React.Fragment>
                        ),
                        shortcut: "mod+s",
                        onClick: saveQuery,
                      }
                    }
                    executeButtonProps={{
                      disabled: !canExecuteQuery,
                      shortcut: "mod+enter, alt+enter",
                      onClick: doExecuteQuery,
                      text: <span className="hidden-xs">{selectedText === null ? "Execute" : "Execute Selected"}</span>,
                    }}
                    autocompleteToggleProps={{
                      available: autocompleteAvailable,
                      enabled: autocompleteEnabled,
                      onToggle: toggleAutocomplete,
                    }}
                    dataSourceSelectorProps={
                      dataSource
                        ? {
                            disabled: !query.can_edit,
                            value: dataSource.id,
                            onChange: handleDataSourceChange,
                            options: map(dataSources, ds => ({ value: ds.id, label: ds.name })),
                          }
                        : false
                    }
                  />
                </section>
              </div>

              {!query.isNew() && <QueryMetadata layout="horizontal" query={query} onEditSchedule={editSchedule} />}

              <section className="flex-fill p-relative t-body query-visualizations-wrapper">
                <div
                  className="d-flex flex-column p-b-15 p-absolute static-position__mobile"
                  style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
                  {query.hasParameters() && (
                    <div className="p-t-15 p-b-5">
                      <Parameters
                        editable={query.can_edit}
                        disableUrlUpdate={query.isNew()}
                        parameters={parameters}
                        onPendingValuesChange={() => setDirtyParameters(query.getParameters().hasPendingValues())}
                        onValuesChange={() => {
                          setDirtyParameters(false);
                          doExecuteQuery();
                        }}
                        onParametersEdit={() => {
                          // save if query clean
                          // https://discuss.redash.io/t/query-unsaved-changes-indication/3302/5
                          if (!isDirty) {
                            saveQuery();
                          }
                        }}
                      />
                    </div>
                  )}
                  {queryResult && queryResultData.status !== "done" && (
                    <div className="query-alerts m-t-15 m-b-15">
                      <QueryExecutionStatus
                        status={queryResultData.status}
                        updatedAt={queryResultData.updatedAt}
                        error={queryResultData.error}
                        onCancel={() => console.log("Query execution cancelled")}
                      />
                    </div>
                  )}

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
                          canDeleteVisualizations={query.can_edit}
                          selectedTab={selectedTab}
                          onChangeTab={setSelectedTab}
                          onClickNewVisualization={() =>
                            addQueryVisualization(query, queryResult).then(({ query, visualization }) => {
                              setQuery(query);
                              setSelectedTab(visualization.id);
                            })
                          }
                          onDeleteVisualization={visualization =>
                            deleteQueryVisualization(query, visualization).then(setQuery)
                          }
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
                    openVisualizationEditor={visId =>
                      editQueryVisualization(
                        query,
                        queryResult,
                        find(query.visualizations, { id: visId })
                      ).then(({ query }) => setQuery(query))
                    }
                    selectedTab={selectedTab}
                  />
                )}
                <QueryControlDropdown
                  query={query}
                  queryResult={queryResult}
                  queryExecuting={isQueryExecuting}
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
                    {!isQueryExecuting && (
                      <React.Fragment>
                        <strong>{durationHumanize(queryResultData.runtime)}</strong>
                        <span className="hidden-xs"> runtime</span>
                      </React.Fragment>
                    )}
                    {isQueryExecuting && <span>Running&hellip;</span>}
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
