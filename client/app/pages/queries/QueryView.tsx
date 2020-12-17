import React, { useState, useEffect, useCallback } from "react";
import cx from "classnames";
import useMedia from "use-media";
import Button from "antd/lib/button";

import FullscreenOutlinedIcon from "@ant-design/icons/FullscreenOutlined";
import FullscreenExitOutlinedIcon from "@ant-design/icons/FullscreenExitOutlined";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import EditInPlace from "@/components/EditInPlace";
import Parameters from "@/components/Parameters";
import DynamicComponent from "@/components/DynamicComponent";

import DataSource from "@/services/data-source";
import { ExecutionStatus } from "@/services/query-result";
import routes from "@/services/routes";
import { policy } from "@/services/policy";

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
import useUpdateQueryDescription from "./hooks/useUpdateQueryDescription";
import useQueryFlags from "./hooks/useQueryFlags";
import useQueryParameters from "./hooks/useQueryParameters";
import useEditScheduleDialog from "./hooks/useEditScheduleDialog";
import useEditVisualizationDialog from "./hooks/useEditVisualizationDialog";
import useDeleteVisualization from "./hooks/useDeleteVisualization";
import useFullscreenHandler from "../../lib/hooks/useFullscreenHandler";

import "./QueryView.less";

type Props = {
    query: any;
};

function QueryView(props: Props) {
  const [query, setQuery] = useState(props.query);
  const [dataSource, setDataSource] = useState();
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);
  const isDesktop = useMedia({ minWidth: 768 });
  const isFixedLayout = useMedia({ minHeight: 500 }) && isDesktop;
  // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
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
  const addVisualization = useEditVisualizationDialog(query, queryResult, (newQuery: any, visualization: any) => {
    setQuery(newQuery);
    setSelectedVisualization(visualization.id);
  });
  const editVisualization = useEditVisualizationDialog(query, queryResult, (newQuery: any) => setQuery(newQuery));
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
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Dispatch<SetStateAction<undefine... Remove this comment to see the full error message
    DataSource.get({ id: query.data_source_id }).then(setDataSource);
  }, [query.data_source_id]);

  return (
    <div
      className={cx("query-page-wrapper", {
        "query-view-fullscreen": fullscreen,
        "query-fixed-layout": isFixedLayout,
      })}>
      <div className="container w-100">
        <QueryPageHeader
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          query={query}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'undefined' is not assignable to type 'never'... Remove this comment to see the full error message
          dataSource={dataSource}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<any>' is not assignable to type 'ne... Remove this comment to see the full error message
          onChange={setQuery}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          selectedVisualization={selectedVisualization}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
          headerExtra={
            <DynamicComponent name="QueryView.HeaderExtra" query={query}>
              {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
              {policy.canRun(query) && (
                // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
                <QueryViewButton
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                  className="m-r-5"
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                  type="primary"
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                  shortcut="mod+enter, alt+enter, ctrl+enter"
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                  disabled={!queryFlags.canExecute || isExecuting || areParametersDirty}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '(skipParametersDirtyFlag?: any) => void' is ... Remove this comment to see the full error message
                  onClick={doExecuteQuery}>
                  Refresh
                </QueryViewButton>
              )}
            </DynamicComponent>
          }
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
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
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ className: string; value: any; isEditable:... Remove this comment to see the full error message
              className="w-100"
              value={query.description}
              isEditable={queryFlags.canEdit}
              onDone={updateQueryDescription}
              onStopEditing={() => setAddingDescription(false)}
              placeholder="Add description"
              ignoreBlanks={false}
              editorProps={{ autoSize: { minRows: 2, maxRows: 4 } }}
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
              // @ts-expect-error ts-migrate(2322) FIXME: Type '(visualizationId?: any) => void' is not assi... Remove this comment to see the full error message
              onAddVisualization={addVisualization}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '(visualizationId: any) => Promise<void>' is ... Remove this comment to see the full error message
              onDeleteVisualization={deleteVisualization}
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'false | Element' is not assignable to type '... Remove this comment to see the full error message
              refreshButton={
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
                policy.canRun(query) && (
                  <Button
                    type="primary"
                    disabled={!queryFlags.canExecute || areParametersDirty}
                    loading={isExecuting}
                    onClick={doExecuteQuery}>
                    {!isExecuting && <i className="zmdi zmdi-refresh m-r-5" aria-hidden="true" />}
                    Refresh Now
                  </Button>
                )
              }
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
              canRefresh={policy.canRun(query)}
            />
          )}
          <div className="query-results-footer">
            {queryResult && !queryResult.getError() && (
              <QueryExecutionMetadata
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                query={query}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                queryResult={queryResult}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                selectedVisualization={selectedVisualization}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                isQueryExecuting={isExecuting}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                showEditVisualizationButton={queryFlags.canEdit}
                // @ts-expect-error ts-migrate(2322) FIXME: Type '(visualizationId?: any) => void' is not assi... Remove this comment to see the full error message
                onEditVisualization={editVisualization}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
                extraActions={
                  // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
                  <QueryViewButton
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                    className="icon-button m-r-5 hidden-xs"
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                    title="Toggle Fullscreen"
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                    type="default"
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                    shortcut="alt+f"
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
                    onClick={toggleFullscreen}>
                    {fullscreen ? <FullscreenExitOutlinedIcon /> : <FullscreenOutlinedIcon />}
                  </QueryViewButton>
                }
              />
            )}
            {(executionError || isExecuting) && (
              <div className="query-execution-status">
                <QueryExecutionStatus
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                  status={executionStatus}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                  error={executionError}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                  isCancelling={isExecutionCancelling}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                  onCancel={cancelExecution}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                  updatedAt={updatedAt}
                />
              </div>
            )}
          </div>
        </div>
        <div className={cx("p-t-15 p-r-15 p-l-15", { hidden: fullscreen })}>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
          <QueryMetadata layout="horizontal" query={query} dataSource={dataSource} onEditSchedule={editSchedule} />
        </div>
      </div>
    </div>
  );
} // eslint-disable-line react/forbid-prop-types

const QueryViewPage = wrapQueryPage(QueryView);

routes.register(
  "Queries.View",
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ path: string; render: (pagePro... Remove this comment to see the full error message
  routeWithUserSession({
    path: "/queries/:queryId",
    render: pageProps => <QueryViewPage {...pageProps} />,
  })
);
