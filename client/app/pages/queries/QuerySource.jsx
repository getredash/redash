import { isEmpty, find, map, extend, includes } from "lodash";
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
import { routesToAngularRoutes } from "@/lib/utils";
import { durationHumanize, prettySize } from "@/filters";
import { Query } from "@/services/query";
import recordEvent from "@/services/recordEvent";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryMetadata from "./components/QueryMetadata";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import SchemaBrowser from "./components/SchemaBrowser";

import useQuery from "./hooks/useQuery";
import useVisualizationTabHandler from "./hooks/useVisualizationTabHandler";
import useAutocompleteFlags from "./hooks/useAutocompleteFlags";
import useQueryExecute from "./hooks/useQueryExecute";
import useQueryDataSources from "./hooks/useQueryDataSources";
import useDataSourceSchema from "./hooks/useDataSourceSchema";
import useQueryFlags from "./hooks/useQueryFlags";
import useQueryParameters from "./hooks/useQueryParameters";
import useAddToDashboardDialog from "./hooks/useAddToDashboardDialog";
import useEmbedDialog from "./hooks/useEmbedDialog";
import useAddNewParameterDialog from "./hooks/useAddNewParameterDialog";
import useEditScheduleDialog from "./hooks/useEditScheduleDialog";
import useEditVisualizationDialog from "./hooks/useEditVisualizationDialog";

import { updateQuery, formatQuery, updateQueryDescription, deleteQueryVisualization } from "./utils";

import "./query-source.less";

function chooseDataSourceId(dataSourceIds, availableDataSources) {
  dataSourceIds = map(dataSourceIds, v => parseInt(v, 10));
  availableDataSources = map(availableDataSources, ds => ds.id);
  return find(dataSourceIds, id => includes(availableDataSources, id)) || null;
}

function QuerySource(props) {
  const { query, setQuery, isDirty, saveQuery } = useQuery(props.query);
  const { dataSourcesLoaded, dataSources, dataSource } = useQueryDataSources(query);
  const [schema, refreshSchema] = useDataSourceSchema(dataSource);
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);

  const {
    queryResult,
    queryResultData,
    isQueryExecuting,
    isExecutionCancelling,
    executeQuery,
    executeAdhocQuery,
    cancelExecution,
  } = useQueryExecute(query);

  const editorRef = useRef(null);
  const [autocompleteAvailable, autocompleteEnabled, toggleAutocomplete] = useAutocompleteFlags(schema);

  const [handleQueryEditorChange] = useDebouncedCallback(queryText => {
    setQuery(extend(query.clone(), { query: queryText }));
  }, 200);

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
    [query, setQuery]
  );

  useEffect(() => {
    // choose data source id for new queries
    if (dataSourcesLoaded && queryFlags.isNew) {
      const firstDataSourceId = dataSources.length > 0 ? dataSources[0].id : null;
      handleDataSourceChange(
        chooseDataSourceId(
          [query.data_source_id, localStorage.getItem("lastSelectedDataSourceId"), firstDataSourceId],
          dataSources
        )
      );
    }
  }, [query.data_source_id, queryFlags.isNew, dataSourcesLoaded, dataSources, handleDataSourceChange]);

  const openAddToDashboardDialog = useAddToDashboardDialog(query);

  const openEmbedDialog = useEmbedDialog(query);

  const editSchedule = useEditScheduleDialog(query, setQuery);

  const openAddNewParameterDialog = useAddNewParameterDialog(query, (newQuery, param) => {
    if (editorRef.current) {
      editorRef.current.paste(param.toQueryTextFragment());
      editorRef.current.focus();
    }
    setQuery(newQuery);
  });

  const addVisualization = useEditVisualizationDialog(query, queryResult, (newQuery, visualization) => {
    setQuery(newQuery);
    setSelectedVisualization(visualization.id);
  });
  const editVisualization = useEditVisualizationDialog(query, queryResult, newQuery => setQuery(newQuery));

  const handleSchemaItemSelect = useCallback(schemaItem => {
    if (editorRef.current) {
      editorRef.current.paste(schemaItem);
    }
  }, []);

  const canExecuteQuery = useMemo(() => queryFlags.canExecute && !isQueryExecuting && !areParametersDirty, [
    isQueryExecuting,
    areParametersDirty,
    queryFlags.canExecute,
  ]);

  const [selectedText, setSelectedText] = useState(null);

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
        <QueryPageHeader
          query={query}
          dataSource={dataSource}
          sourceMode
          selectedVisualization={selectedVisualization}
          onChange={setQuery}
        />
      </div>
      <main className="query-fullscreen">
        <nav>
          <div className="editor__left__data-source">
            <Select
              className="w-100"
              placeholder="Choose data source..."
              value={dataSource ? dataSource.id : undefined}
              disabled={!queryFlags.canEdit || !dataSourcesLoaded || dataSources.length === 0}
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
            <SchemaBrowser
              schema={schema}
              onRefresh={() => refreshSchema(true)}
              onItemSelect={handleSchemaItemSelect}
            />
          </div>

          {!query.isNew() && (
            <div className="query-metadata query-metadata--description">
              <EditInPlace
                isEditable={queryFlags.canEdit}
                markdown
                ignoreBlanks={false}
                placeholder="Add description"
                value={query.description}
                onDone={description => {
                  updateQueryDescription(query, description).then(setQuery);
                }}
                multiline
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
                    onSelectionChange={setSelectedText}
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
                      onClick: () => {
                        formatQuery(query, dataSource.syntax).then(setQuery);
                      },
                    }}
                    saveButtonProps={
                      queryFlags.canEdit && {
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
                            disabled: !queryFlags.canEdit,
                            value: dataSource.id,
                            onChange: handleDataSourceChange,
                            options: map(dataSources, ds => ({ value: ds.id, label: ds.name })),
                          }
                        : false
                    }
                  />
                </section>
              </div>

              {!queryFlags.isNew && <QueryMetadata layout="horizontal" query={query} onEditSchedule={editSchedule} />}

              <section className="flex-fill p-relative t-body query-visualizations-wrapper">
                <div
                  className="d-flex flex-column p-b-15 p-absolute static-position__mobile"
                  style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
                  {query.hasParameters() && (
                    <div className="p-t-15 p-b-5">
                      <Parameters
                        editable={queryFlags.canEdit}
                        disableUrlUpdate={queryFlags.isNew}
                        parameters={parameters}
                        onPendingValuesChange={() => updateParametersDirtyFlag()}
                        onValuesChange={() => {
                          updateParametersDirtyFlag(false);
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
                        isCancelling={isExecutionCancelling}
                        onCancel={cancelExecution}
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
                          showNewVisualizationButton={queryFlags.canEdit}
                          canDeleteVisualizations={queryFlags.canEdit}
                          selectedTab={selectedVisualization}
                          onChangeTab={setSelectedVisualization}
                          onAddVisualization={addVisualization}
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
                {!queryFlags.isNew && queryFlags.canEdit && (
                  <EditVisualizationButton
                    openVisualizationEditor={editVisualization}
                    selectedTab={selectedVisualization}
                  />
                )}
                <QueryControlDropdown
                  query={query}
                  queryResult={queryResult}
                  queryExecuting={isQueryExecuting}
                  showEmbedDialog={openEmbedDialog}
                  embed={false}
                  apiKey={query.api_key}
                  selectedTab={selectedVisualization}
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
