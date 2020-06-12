import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import useMedia from "use-media";
import Button from "antd/lib/button";
import Icon from "antd/lib/icon";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import EditInPlace from "@/components/EditInPlace";
import Parameters from "@/components/Parameters";

import { ExecutionStatus } from "@/services/query-result";
import useQueryResultData from "@/lib/useQueryResultData";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import QueryMetadata from "./components/QueryMetadata";
import wrapQueryPage from "./components/wrapQueryPage";
import QueryViewButton from "./components/QueryViewButton";
import QueryExecutionMetadata from "./components/QueryExecutionMetadata";

import useVisualizationTabHandler from "./hooks/useVisualizationTabHandler";
import useQueryExecute from "./hooks/useQueryExecute";
import useQueryDataSources from "./hooks/useQueryDataSources";
import useUpdateQueryDescription from "./hooks/useUpdateQueryDescription";
import useQueryFlags from "./hooks/useQueryFlags";
import useQueryParameters from "./hooks/useQueryParameters";
import useEditScheduleDialog from "./hooks/useEditScheduleDialog";
import useEditVisualizationDialog from "./hooks/useEditVisualizationDialog";
import useDeleteVisualization from "./hooks/useDeleteVisualization";
import useFullscreenHandler from "../../lib/hooks/useFullscreenHandler";

import "./QueryView.less";

function QueryView(props) {
  const [query, setQuery] = useState(props.query);
  const { dataSource } = useQueryDataSources(query);
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);
  const isDesktop = useMedia({ minWidth: 768 });
  const isFixedLayout = useMedia({ minHeight: 500 }) && isDesktop;
  const [fullscreen, toggleFullscreen] = useFullscreenHandler(isDesktop);
  const [addingDescription, setAddingDescription] = useState(false);

  const {
    queryResult,
    loadedInitialResults,
    isExecuting,
    executionStatus,
    executeQuery,
    error: executionError,
    cancelCallback: cancelExecution,
    isCancelling: isExecutionCancelling,
    updatedAt,
  } = useQueryExecute(query);

  const queryResultData = useQueryResultData(queryResult);

  const updateQueryDescription = useUpdateQueryDescription(query, setQuery);
  const editSchedule = useEditScheduleDialog(query, setQuery);
  const addVisualization = useEditVisualizationDialog(query, queryResult, (newQuery, visualization) => {
    setQuery(newQuery);
    setSelectedVisualization(visualization.id);
  });
  const editVisualization = useEditVisualizationDialog(query, queryResult, newQuery => setQuery(newQuery));
  const deleteVisualization = useDeleteVisualization(query, setQuery);

  const doExecuteQuery = useCallback(
    (skipParametersDirtyFlag = false) => {
      if (!queryFlags.canExecute || (!skipParametersDirtyFlag && (areParametersDirty || isExecuting))) {
        return;
      }
      executeQuery();
    },
    [areParametersDirty, executeQuery, isExecuting, queryFlags.canExecute]
  );

  useEffect(() => {
    document.title = query.name;
  }, [query.name]);

  return (
    <div
      className={cx("query-page-wrapper", {
        "query-view-fullscreen": fullscreen,
        "query-fixed-layout": isFixedLayout,
      })}>
      <div className="container">
        <QueryPageHeader
          query={query}
          dataSource={dataSource}
          onChange={setQuery}
          selectedVisualization={selectedVisualization}
          headerExtra={
            <QueryViewButton
              className="m-r-5"
              type="primary"
              shortcut="mod+enter, alt+enter, ctrl+enter"
              disabled={!queryFlags.canExecute || isExecuting || areParametersDirty}
              onClick={doExecuteQuery}>
              Refresh
            </QueryViewButton>
          }
          tagsExtra={
            !query.description &&
            queryFlags.canEdit &&
            !addingDescription &&
            !fullscreen && (
              <a className="label label-tag hidden-xs" role="none" onClick={() => setAddingDescription(true)}>
                <i className="zmdi zmdi-plus m-r-5" />
                Add description
              </a>
            )
          }
        />
        {(query.description || addingDescription) && (
          <div className={cx("m-t-5", { hidden: fullscreen })}>
            <EditInPlace
              className="w-100"
              value={query.description}
              isEditable={queryFlags.canEdit}
              onDone={updateQueryDescription}
              onStopEditing={() => setAddingDescription(false)}
              placeholder="Add description"
              ignoreBlanks={false}
              editorProps={{ autosize: { minRows: 2, maxRows: 4 } }}
              defaultEditing={addingDescription}
              multiline
            />
          </div>
        )}
      </div>
      <div className="query-view-content">
        {query.hasParameters() && (
          <div className={cx("bg-white tiled p-15 m-t-15 m-l-15 m-r-15", { hidden: fullscreen })}>
            <Parameters
              parameters={parameters}
              onValuesChange={() => {
                updateParametersDirtyFlag(false);
                doExecuteQuery(true);
              }}
              onPendingValuesChange={() => updateParametersDirtyFlag()}
            />
          </div>
        )}
        <div className="query-results m-t-15">
          {loadedInitialResults && (
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
                  loading={isExecuting}
                  onClick={doExecuteQuery}>
                  {!isExecuting && <i className="zmdi zmdi-refresh m-r-5" aria-hidden="true" />}
                  Refresh Now
                </Button>
              }
            />
          )}
          <div className="query-results-footer">
            {queryResult && !queryResult.getError() && (
              <QueryExecutionMetadata
                query={query}
                queryResult={queryResult}
                selectedVisualization={selectedVisualization}
                isQueryExecuting={isExecuting}
                showEditVisualizationButton={queryFlags.canEdit}
                onEditVisualization={editVisualization}
                extraActions={
                  <QueryViewButton
                    className="icon-button m-r-5 hidden-xs"
                    title="Toggle Fullscreen"
                    type="default"
                    shortcut="alt+f"
                    onClick={toggleFullscreen}>
                    <Icon type={fullscreen ? "fullscreen-exit" : "fullscreen"} />
                  </QueryViewButton>
                }
              />
            )}
            {(executionError || isExecuting) && (
              <div className="query-execution-status">
                <QueryExecutionStatus
                  status={executionStatus}
                  error={executionError}
                  isCancelling={isExecutionCancelling}
                  onCancel={cancelExecution}
                  updatedAt={updatedAt}
                />
              </div>
            )}
          </div>
        </div>
        <div className={cx("p-t-15 p-r-15 p-l-15", { hidden: fullscreen })}>
          <QueryMetadata layout="horizontal" query={query} dataSource={dataSource} onEditSchedule={editSchedule} />
        </div>
      </div>
    </div>
  );
}

QueryView.propTypes = { query: PropTypes.object.isRequired }; // eslint-disable-line react/forbid-prop-types

const QueryViewPage = wrapQueryPage(QueryView);

export default routeWithUserSession({
  path: "/queries/:queryId([0-9]+)",
  render: pageProps => <QueryViewPage {...pageProps} />,
});
