import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import useMedia from "use-media";
import Button from "antd/lib/button";
import Icon from "antd/lib/icon";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import EditInPlace from "@/components/EditInPlace";
import Parameters from "@/components/Parameters";
import TimeAgo from "@/components/TimeAgo";
import QueryControlDropdown from "@/components/EditVisualizationButton/QueryControlDropdown";
import EditVisualizationButton from "@/components/EditVisualizationButton";

import { Query } from "@/services/query";
import DataSource from "@/services/data-source";
import { ExecutionStatus } from "@/services/query-result";
import { pluralize, durationHumanize } from "@/lib/utils";
import getQueryResultData from "@/lib/getQueryResultData";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import QueryMetadata from "./components/QueryMetadata";
import QueryViewButton from "./components/QueryViewButton";

import useVisualizationTabHandler from "./hooks/useVisualizationTabHandler";
import useQueryExecute from "./hooks/useQueryExecute";
import useUpdateQueryDescription from "./hooks/useUpdateQueryDescription";
import useQueryFlags from "./hooks/useQueryFlags";
import useQueryParameters from "./hooks/useQueryParameters";
import useAddToDashboardDialog from "./hooks/useAddToDashboardDialog";
import useEmbedDialog from "./hooks/useEmbedDialog";
import useEditScheduleDialog from "./hooks/useEditScheduleDialog";
import useEditVisualizationDialog from "./hooks/useEditVisualizationDialog";
import useDeleteVisualization from "./hooks/useDeleteVisualization";

import "./QueryView.less";

function useFullscreenHandler(available) {
  const [fullscreen, setFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setFullscreen(!fullscreen), [fullscreen]);

  return useMemo(() => [available && fullscreen, toggleFullscreen], [available, fullscreen, toggleFullscreen]);
}

function QueryView(props) {
  const [query, setQuery] = useState(props.query);
  const [dataSource, setDataSource] = useState();
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);
  const isMobile = !useMedia({ minWidth: 768 });
  const [fullscreen, toggleFullscreen] = useFullscreenHandler(!isMobile);
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

  const queryResultData = getQueryResultData(queryResult);

  const updateQueryDescription = useUpdateQueryDescription(query, setQuery);
  const openAddToDashboardDialog = useAddToDashboardDialog(query);
  const openEmbedDialog = useEmbedDialog(query);
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

  useEffect(() => {
    DataSource.get({ id: query.data_source_id }).then(setDataSource);
  }, [query.data_source_id]);

  return (
    <div className={cx("query-page-wrapper", { "query-view-fullscreen": fullscreen, "query-fixed-layout": !isMobile })}>
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
              shortcut="mod+enter, alt+enter"
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
              <a className="label label-tag" role="none" onClick={() => setAddingDescription(true)}>
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
          {queryResult && !queryResult.getError() && (
            <div className="query-results-footer d-flex align-items-center">
              <span className="m-r-5">
                <QueryControlDropdown
                  query={query}
                  queryResult={queryResult}
                  queryExecuting={isExecuting}
                  showEmbedDialog={openEmbedDialog}
                  embed={false}
                  apiKey={query.api_key}
                  selectedTab={selectedVisualization}
                  openAddToDashboardForm={openAddToDashboardDialog}
                />
              </span>
              <QueryViewButton
                className="icon-button m-r-5 hidden-xs"
                title="Toggle Fullscreen"
                type="default"
                shortcut="alt+f"
                onClick={toggleFullscreen}>
                <Icon type={fullscreen ? "fullscreen-exit" : "fullscreen"} />
              </QueryViewButton>
              {queryFlags.canEdit && (
                <EditVisualizationButton
                  openVisualizationEditor={editVisualization}
                  selectedTab={selectedVisualization}
                />
              )}
              <span className="m-l-5">
                <strong>{queryResultData.rows.length}</strong> {pluralize("row", queryResultData.rows.length)}
              </span>
              <span className="m-l-10">
                <strong>{durationHumanize(queryResultData.runtime)}</strong>
                <span className="hidden-xs"> runtime</span>
              </span>
              <span className="flex-fill" />
              <span className="m-r-10 hidden-xs">
                Refreshed{" "}
                <strong>
                  <TimeAgo date={queryResultData.retrievedAt} />
                </strong>
              </span>
            </div>
          )}
        </div>
        <div className={cx("p-t-15 p-r-15 p-l-15", { hidden: fullscreen })}>
          <QueryMetadata layout="horizontal" query={query} dataSource={dataSource} onEditSchedule={editSchedule} />
        </div>
      </div>
    </div>
  );
}

QueryView.propTypes = { query: PropTypes.object.isRequired }; // eslint-disable-line react/forbid-prop-types

export default routeWithUserSession({
  path: "/queries/:queryId([0-9]+)",
  render: pageProps => <QueryView {...pageProps} />,
  resolve: {
    query: ({ queryId }) => Query.get({ id: queryId }),
  },
});
