import { extend, find, includes, isEmpty, map } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { useDebouncedCallback } from "use-debounce";
import useMedia from "use-media";
import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Resizable from "@/components/Resizable";
import Parameters from "@/components/Parameters";
import EditInPlace from "@/components/EditInPlace";
import DynamicComponent from "@/components/DynamicComponent";
import recordEvent from "@/services/recordEvent";
import { ExecutionStatus } from "@/services/query-result";
import routes from "@/services/routes";
import notification from "@/services/notification";
import * as queryFormat from "@/lib/queryFormat";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryMetadata from "./components/QueryMetadata";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import QuerySourceAlerts from "./components/QuerySourceAlerts";
import wrapQueryPage from "./components/wrapQueryPage";
import QueryExecutionMetadata from "./components/QueryExecutionMetadata";

import { getEditorComponents } from "@/components/queries/editor-components";
import useQuery from "./hooks/useQuery";
import useVisualizationTabHandler from "./hooks/useVisualizationTabHandler";
import useAutocompleteFlags from "./hooks/useAutocompleteFlags";
import useAutoLimitFlags from "./hooks/useAutoLimitFlags";
import useQueryExecute from "./hooks/useQueryExecute";
import useQueryResultData from "@/lib/useQueryResultData";
import useQueryDataSources from "./hooks/useQueryDataSources";
import useQueryFlags from "./hooks/useQueryFlags";
import useQueryParameters from "./hooks/useQueryParameters";
import useAddNewParameterDialog from "./hooks/useAddNewParameterDialog";
import useEditScheduleDialog from "./hooks/useEditScheduleDialog";
import useAddVisualizationDialog from "./hooks/useAddVisualizationDialog";
import useEditVisualizationDialog from "./hooks/useEditVisualizationDialog";
import useDeleteVisualization from "./hooks/useDeleteVisualization";
import useUpdateQuery from "./hooks/useUpdateQuery";
import useUpdateQueryDescription from "./hooks/useUpdateQueryDescription";
import useUnsavedChangesAlert from "./hooks/useUnsavedChangesAlert";

import "./components/QuerySourceDropdown"; // register QuerySourceDropdown
import "./QuerySource.less";

function chooseDataSourceId(dataSourceIds, availableDataSources) {
  availableDataSources = map(availableDataSources, ds => ds.id);
  return find(dataSourceIds, id => includes(availableDataSources, id)) || null;
}

function QuerySource(props) {
  const { query, setQuery, isDirty, saveQuery } = useQuery(props.query);
  const { dataSourcesLoaded, dataSources, dataSource } = useQueryDataSources(query);
  const [schema, setSchema] = useState([]);
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);
  const { QueryEditor, SchemaBrowser } = getEditorComponents(dataSource && dataSource.type);
  const isMobile = !useMedia({ minWidth: 768 });

  useUnsavedChangesAlert(isDirty);

  const {
    queryResult,
    isExecuting: isQueryExecuting,
    executionStatus,
    executeQuery,
    error: executionError,
    cancelCallback: cancelExecution,
    isCancelling: isExecutionCancelling,
    updatedAt,
    loadedInitialResults,
  } = useQueryExecute(query);

  const queryResultData = useQueryResultData(queryResult);

  const editorRef = useRef(null);
  const [autocompleteAvailable, autocompleteEnabled, toggleAutocomplete] = useAutocompleteFlags(schema);
  const [autoLimitAvailable, autoLimitChecked, setAutoLimit] = useAutoLimitFlags(dataSource, query, setQuery);

  const [handleQueryEditorChange] = useDebouncedCallback(queryText => {
    setQuery(extend(query.clone(), { query: queryText }));
  }, 100);

  useEffect(() => {
    // TODO: ignore new pages?
    recordEvent("view_source", "query", query.id);
  }, [query.id]);

  useEffect(() => {
    document.title = query.name;
  }, [query.name]);

  const updateQuery = useUpdateQuery(query, setQuery);
  const updateQueryDescription = useUpdateQueryDescription(query, setQuery);
  const querySyntax = dataSource ? dataSource.syntax || "sql" : null;
  const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(querySyntax);
  const formatQuery = () => {
    try {
      const formattedQueryText = queryFormat.formatQuery(query.query, querySyntax);
      setQuery(extend(query.clone(), { query: formattedQueryText }));
    } catch (err) {
      notification.error(String(err));
    }
  };

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
        const updates = {
          data_source_id: dataSourceId,
          latest_query_data_id: null,
          latest_query_data: null,
        };
        setQuery(extend(query.clone(), updates));
        updateQuery(updates, { successMessage: null }); // show message only on error
      }
    },
    [query, setQuery, updateQuery]
  );

  useEffect(() => {
    // choose data source id for new queries
    if (dataSourcesLoaded && queryFlags.isNew) {
      const firstDataSourceId = dataSources.length > 0 ? dataSources[0].id : null;
      const selectedDataSourceId = parseInt(localStorage.getItem("lastSelectedDataSourceId")) || null;

      handleDataSourceChange(
        chooseDataSourceId([query.data_source_id, selectedDataSourceId, firstDataSourceId], dataSources)
      );
    }
  }, [query.data_source_id, queryFlags.isNew, dataSourcesLoaded, dataSources, handleDataSourceChange]);

  const editSchedule = useEditScheduleDialog(query, setQuery);
  const openAddNewParameterDialog = useAddNewParameterDialog(query, (newQuery, param) => {
    if (editorRef.current) {
      editorRef.current.paste(param.toQueryTextFragment());
      editorRef.current.focus();
    }
    setQuery(newQuery);
  });

  const handleSchemaItemSelect = useCallback(schemaItem => {
    if (editorRef.current) {
      editorRef.current.paste(schemaItem);
    }
  }, []);

  const [selectedText, setSelectedText] = useState(null);

  const doExecuteQuery = useCallback(
    (skipParametersDirtyFlag = false) => {
      if (!queryFlags.canExecute || (!skipParametersDirtyFlag && (areParametersDirty || isQueryExecuting))) {
        return;
      }
      if (isDirty || !isEmpty(selectedText)) {
        executeQuery(null, () => {
          return query.getQueryResultByText(0, selectedText);
        });
      } else {
        executeQuery();
      }
    },
    [query, queryFlags.canExecute, areParametersDirty, isQueryExecuting, isDirty, selectedText, executeQuery]
  );

  const [isQuerySaving, setIsQuerySaving] = useState(false);

  const doSaveQuery = useCallback(() => {
    if (!isQuerySaving) {
      setIsQuerySaving(true);
      saveQuery().finally(() => setIsQuerySaving(false));
    }
  }, [isQuerySaving, saveQuery]);

  const addVisualization = useAddVisualizationDialog(query, queryResult, doSaveQuery, (newQuery, visualization) => {
    setQuery(newQuery);
    setSelectedVisualization(visualization.id);
  });
  const editVisualization = useEditVisualizationDialog(query, queryResult, newQuery => setQuery(newQuery));
  const deleteVisualization = useDeleteVisualization(query, setQuery);

  return (
    <div className={cx("query-page-wrapper", { "query-fixed-layout": !isMobile })}>
      <QuerySourceAlerts query={query} dataSourcesAvailable={!dataSourcesLoaded || dataSources.length > 0} />
      <div className="container w-100 p-b-10">
        <QueryPageHeader
          query={query}
          dataSource={dataSource}
          sourceMode
          selectedVisualization={selectedVisualization}
          headerExtra={<DynamicComponent name="QuerySource.HeaderExtra" query={query} />}
          onChange={setQuery}
        />
      </div>
      <main className="query-fullscreen">
        <Resizable direction="horizontal" sizeAttribute="flex-basis" toggleShortcut="Alt+Shift+D, Alt+D">
          <nav>
            {dataSourcesLoaded && (
              <div className="editor__left__data-source">
                <DynamicComponent
                  name={"QuerySourceDropdown"}
                  dataSources={dataSources}
                  value={dataSource ? dataSource.id : undefined}
                  disabled={!queryFlags.canEdit || !dataSourcesLoaded || dataSources.length === 0}
                  loading={!dataSourcesLoaded}
                  onChange={handleDataSourceChange}
                />
              </div>
            )}
            <div className="editor__left__schema">
              <SchemaBrowser
                dataSource={dataSource}
                options={query.options.schemaOptions}
                onOptionsUpdate={schemaOptions =>
                  setQuery(extend(query.clone(), { options: { ...query.options, schemaOptions } }))
                }
                onSchemaUpdate={setSchema}
                onItemSelect={handleSchemaItemSelect}
              />
            </div>

            {!query.isNew() && (
              <div className="query-page-query-description">
                <EditInPlace
                  isEditable={queryFlags.canEdit}
                  markdown
                  ignoreBlanks={false}
                  placeholder="Add description"
                  value={query.description}
                  onDone={updateQueryDescription}
                  multiline
                />
              </div>
            )}

            {!query.isNew() && <QueryMetadata layout="table" query={query} onEditSchedule={editSchedule} />}
          </nav>
        </Resizable>

        <div className="content">
          <div className="flex-fill p-relative">
            <div
              className="p-absolute d-flex flex-column p-l-15 p-r-15"
              style={{ left: 0, top: 0, right: 0, bottom: 0, overflow: "auto" }}>
              <Resizable direction="vertical" sizeAttribute="flex-basis">
                <div className="row editor">
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
                        title: isFormatQueryAvailable
                          ? "Format Query"
                          : "Query formatting is not supported for your Data Source syntax",
                        disabled: !dataSource || !isFormatQueryAvailable,
                        shortcut: isFormatQueryAvailable ? "mod+shift+f" : null,
                        onClick: formatQuery,
                      }}
                      saveButtonProps={
                        queryFlags.canEdit && {
                          text: (
                            <React.Fragment>
                              <span className="hidden-xs">Save</span>
                              {isDirty && !isQuerySaving ? "*" : null}
                            </React.Fragment>
                          ),
                          shortcut: "mod+s",
                          onClick: doSaveQuery,
                          loading: isQuerySaving,
                        }
                      }
                      executeButtonProps={{
                        disabled: !queryFlags.canExecute || isQueryExecuting || areParametersDirty,
                        shortcut: "mod+enter, alt+enter, ctrl+enter, shift+enter",
                        onClick: doExecuteQuery,
                        text: (
                          <span className="hidden-xs">{selectedText === null ? "Execute" : "Execute Selected"}</span>
                        ),
                      }}
                      autocompleteToggleProps={{
                        available: autocompleteAvailable,
                        enabled: autocompleteEnabled,
                        onToggle: toggleAutocomplete,
                      }}
                      autoLimitCheckboxProps={{
                        available: autoLimitAvailable,
                        checked: autoLimitChecked,
                        onChange: setAutoLimit,
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
              </Resizable>

              {!queryFlags.isNew && <QueryMetadata layout="horizontal" query={query} onEditSchedule={editSchedule} />}

              <section className="query-results-wrapper">
                {query.hasParameters() && (
                  <div className="query-parameters-wrapper">
                    <Parameters
                      editable={queryFlags.canEdit}
                      sortable={queryFlags.canEdit}
                      disableUrlUpdate={queryFlags.isNew}
                      parameters={parameters}
                      onPendingValuesChange={() => updateParametersDirtyFlag()}
                      onValuesChange={() => {
                        updateParametersDirtyFlag(false);
                        doExecuteQuery(true);
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
                {(executionError || isQueryExecuting) && (
                  <div className="query-alerts">
                    <QueryExecutionStatus
                      status={executionStatus}
                      updatedAt={updatedAt}
                      error={executionError}
                      isCancelling={isExecutionCancelling}
                      onCancel={cancelExecution}
                    />
                  </div>
                )}

                <React.Fragment>
                  {queryResultData.log.length > 0 && (
                    <div className="query-results-log">
                      <p>Log Information:</p>
                      {map(queryResultData.log, (line, index) => (
                        <p key={`log-line-${index}`} className="query-log-line">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                  {loadedInitialResults && !(queryFlags.isNew && !queryResult) && (
                    <QueryVisualizationTabs
                      queryResult={queryResult}
                      visualizations={query.visualizations}
                      showNewVisualizationButton={queryFlags.canEdit && queryResultData.status === ExecutionStatus.DONE}
                      canDeleteVisualizations={queryFlags.canEdit}
                      selectedTab={selectedVisualization}
                      onChangeTab={setSelectedVisualization}
                      onAddVisualization={addVisualization}
                      onDeleteVisualization={deleteVisualization}
                      refreshButton={
                        <Button
                          type="primary"
                          disabled={!queryFlags.canExecute || areParametersDirty}
                          loading={isQueryExecuting}
                          onClick={doExecuteQuery}>
                          {!isQueryExecuting && <i className="zmdi zmdi-refresh m-r-5" aria-hidden="true" />}
                          Refresh Now
                        </Button>
                      }
                    />
                  )}
                </React.Fragment>
              </section>
            </div>
          </div>
          {queryResult && !queryResult.getError() && (
            <div className="bottom-controller-container">
              <QueryExecutionMetadata
                query={query}
                queryResult={queryResult}
                selectedVisualization={selectedVisualization}
                isQueryExecuting={isQueryExecuting}
                showEditVisualizationButton={!queryFlags.isNew && queryFlags.canEdit}
                onEditVisualization={editVisualization}
              />
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

const QuerySourcePage = wrapQueryPage(QuerySource);

routes.register(
  "Queries.New",
  routeWithUserSession({
    path: "/queries/new",
    render: pageProps => <QuerySourcePage {...pageProps} />,
    bodyClass: "fixed-layout",
  })
);
routes.register(
  "Queries.Edit",
  routeWithUserSession({
    path: "/queries/:queryId/source",
    render: pageProps => <QuerySourcePage {...pageProps} />,
    bodyClass: "fixed-layout",
  })
);
