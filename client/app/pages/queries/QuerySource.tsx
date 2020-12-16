import { extend, find, includes, isEmpty, map } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

function chooseDataSourceId(dataSourceIds: any, availableDataSources: any) {
  availableDataSources = map(availableDataSources, ds => ds.id);
  return find(dataSourceIds, id => includes(availableDataSources, id)) || null;
}

type Props = {
    query: any;
};

function QuerySource(props: Props) {
  const { query, setQuery, isDirty, saveQuery } = useQuery(props.query);
  const { dataSourcesLoaded, dataSources, dataSource } = useQueryDataSources(query);
  const [schema, setSchema] = useState([]);
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);
  // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
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
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
    recordEvent("view_source", "query", query.id);
  }, [query.id]);

  useEffect(() => {
    document.title = query.name;
  }, [query.name]);

  const updateQuery = useUpdateQuery(query, setQuery);
  const updateQueryDescription = useUpdateQueryDescription(query, setQuery);
  // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
  const querySyntax = dataSource ? dataSource.syntax || "sql" : null;
  const isFormatQueryAvailable = queryFormat.isFormatQueryAvailable(querySyntax);
  const formatQuery = () => {
    try {
      const formattedQueryText = queryFormat.formatQuery(query.query, querySyntax);
      setQuery(extend(query.clone(), { query: formattedQueryText }));
    } catch (err) {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
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
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
      const firstDataSourceId = dataSources.length > 0 ? dataSources[0].id : null;
      handleDataSourceChange(
        chooseDataSourceId(
          [query.data_source_id, localStorage.getItem("lastSelectedDataSourceId"), firstDataSourceId],
          dataSources
        )
      );
    }
  }, [query.data_source_id, queryFlags.isNew, dataSourcesLoaded, dataSources, handleDataSourceChange]);

  const editSchedule = useEditScheduleDialog(query, setQuery);
  const openAddNewParameterDialog = useAddNewParameterDialog(query, (newQuery: any, param: any) => {
    if (editorRef.current) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      editorRef.current.paste(param.toQueryTextFragment());
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      editorRef.current.focus();
    }
    setQuery(newQuery);
  });

  const handleSchemaItemSelect = useCallback(schemaItem => {
    if (editorRef.current) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
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

  const addVisualization = useAddVisualizationDialog(query, queryResult, doSaveQuery, (newQuery: any, visualization: any) => {
    setQuery(newQuery);
    setSelectedVisualization(visualization.id);
  });
  const editVisualization = useEditVisualizationDialog(query, queryResult, (newQuery: any) => setQuery(newQuery));
  const deleteVisualization = useDeleteVisualization(query, setQuery);

  return (
    <div className={cx("query-page-wrapper", { "query-fixed-layout": !isMobile })}>
      <QuerySourceAlerts query={query} dataSourcesAvailable={!dataSourcesLoaded || dataSources.length > 0} />
      <div className="container w-100 p-b-10">
        <QueryPageHeader
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          query={query}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'never'.
          dataSource={dataSource}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          sourceMode
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          selectedVisualization={selectedVisualization}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
          headerExtra={<DynamicComponent name="QuerySource.HeaderExtra" query={query} />}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<any>' is not assignable to type 'ne... Remove this comment to see the full error message
          onChange={setQuery}
        />
      </div>
      <main className="query-fullscreen">
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Resizable direction="horizontal" sizeAttribute="flex-basis" toggleShortcut="Alt+Shift+D, Alt+D">
          <nav>
            {dataSourcesLoaded && (
              <div className="editor__left__data-source">
                <DynamicComponent
                  name={"QuerySourceDropdown"}
                  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                  dataSources={dataSources}
                  // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
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
                onOptionsUpdate={(schemaOptions: any) => setQuery(extend(query.clone(), { options: { ...query.options, schemaOptions } }))
                }
                onSchemaUpdate={setSchema}
                onItemSelect={handleSchemaItemSelect}
              />
            </div>

            {!query.isNew() && (
              <div className="query-page-query-description">
                <EditInPlace
                  isEditable={queryFlags.canEdit}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ isEditable: any; markdown: true; ignoreBla... Remove this comment to see the full error message
                  markdown
                  ignoreBlanks={false}
                  placeholder="Add description"
                  value={query.description}
                  onDone={updateQueryDescription}
                  multiline
                />
              </div>
            )}

            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
            {!query.isNew() && <QueryMetadata layout="table" query={query} onEditSchedule={editSchedule} />}
          </nav>
        </Resizable>

        <div className="content">
          <div className="flex-fill p-relative">
            <div
              className="p-absolute d-flex flex-column p-l-15 p-r-15"
              style={{ left: 0, top: 0, right: 0, bottom: 0, overflow: "auto" }}>
              {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <Resizable direction="vertical" sizeAttribute="flex-basis">
                <div className="row editor">
                  <section className="query-editor-wrapper" data-test="QueryEditor">
                    <QueryEditor
                      ref={editorRef}
                      data-executing={isQueryExecuting ? "true" : null}
                      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
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
                              // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                              value: dataSource.id,
                              onChange: handleDataSourceChange,
                              // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
                              options: map(dataSources, ds => ({ value: ds.id, label: ds.name })),
                            }
                          : false
                      }
                    />
                  </section>
                </div>
              </Resizable>

              {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
              {!queryFlags.isNew && <QueryMetadata layout="horizontal" query={query} onEditSchedule={editSchedule} />}

              <section className="query-results-wrapper">
                {query.hasParameters() && (
                  <div className="query-parameters-wrapper">
                    <Parameters
                      editable={queryFlags.canEdit}
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
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      status={executionStatus}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      updatedAt={updatedAt}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      error={executionError}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      isCancelling={isExecutionCancelling}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
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
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      queryResult={queryResult}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      visualizations={query.visualizations}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      showNewVisualizationButton={queryFlags.canEdit && queryResultData.status === ExecutionStatus.DONE}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      canDeleteVisualizations={queryFlags.canEdit}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      selectedTab={selectedVisualization}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                      onChangeTab={setSelectedVisualization}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type '() => void' is not assignable to type 'never... Remove this comment to see the full error message
                      onAddVisualization={addVisualization}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type '(visualizationId: any) => Promise<void>' is ... Remove this comment to see the full error message
                      onDeleteVisualization={deleteVisualization}
                      // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
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
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                query={query}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                queryResult={queryResult}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                selectedVisualization={selectedVisualization}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                isQueryExecuting={isQueryExecuting}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                showEditVisualizationButton={!queryFlags.isNew && queryFlags.canEdit}
                // @ts-expect-error ts-migrate(2322) FIXME: Type '(visualizationId?: any) => void' is not assi... Remove this comment to see the full error message
                onEditVisualization={editVisualization}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const QuerySourcePage = wrapQueryPage(QuerySource);

routes.register(
  "Queries.New",
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ path: string; render: (pagePro... Remove this comment to see the full error message
  routeWithUserSession({
    path: "/queries/new",
    render: pageProps => <QuerySourcePage {...pageProps} />,
    bodyClass: "fixed-layout",
  })
);
routes.register(
  "Queries.Edit",
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ path: string; render: (pagePro... Remove this comment to see the full error message
  routeWithUserSession({
    path: "/queries/:queryId/source",
    render: pageProps => <QuerySourcePage {...pageProps} />,
    bodyClass: "fixed-layout",
  })
);
