import React, { useMemo, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { find, isArray, intersection } from "lodash";
import { react2angular } from "react2angular";
import Divider from "antd/lib/divider";
import Button from "antd/lib/button";

import { EditInPlace } from "@/components/EditInPlace";
import { Parameters } from "@/components/Parameters";
import { TimeAgo } from "@/components/TimeAgo";
import { QueryControlDropdown } from "@/components/EditVisualizationButton/QueryControlDropdown";
import EmbedQueryDialog from "@/components/queries/EmbedQueryDialog";
import AddToDashboardDialog from "@/components/queries/AddToDashboardDialog";
import { EditVisualizationButton } from "@/components/EditVisualizationButton";
import ScheduleDialog from "@/components/queries/ScheduleDialog";
import QueryPageHeader from "./components/QueryPageHeader";

import { clientConfig } from "@/services/auth";
import { policy } from "@/services/policy";
import { DataSource } from "@/services/data-source";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import QueryMetadata from "./components/QueryMetadata";
import { pluralize, durationHumanize } from "@/filters";
import {
  updateQuery,
  deleteQueryVisualization,
  addQueryVisualization,
  editQueryVisualization,
  updateQueryDescription,
} from "./utils";
import useVisualizationTabHandler from "./utils/useVisualizationTabHandler";
import useQueryExecute from "./utils/useQueryExecute";

import "./query-view.less";

function QueryView(props) {
  const [query, setQuery] = useState(props.query);
  const [selectedTab, setSelectedTab] = useVisualizationTabHandler(query.visualizations);
  const currentVisualization = useMemo(() => find(query.visualizations, { id: selectedTab }), [
    query.visualizations,
    selectedTab,
  ]);
  const parameters = useMemo(() => query.getParametersDefs(), [query]);
  const [dirtyParameters, setDirtyParameters] = useState(query.$parameters.hasPendingValues());
  const [dataSource, setDataSource] = useState();
  const { queryResult, queryResultData, isQueryExecuting, executeQuery } = useQueryExecute(query);

  const openScheduleDialog = useCallback(() => {
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
    }).result.then(schedule => updateQuery(query, { schedule }).then(setQuery));
  }, [query]);

  useEffect(() => {
    document.title = query.name;
  }, [query.name]);

  useEffect(() => {
    DataSource.get({ id: query.data_source_id }).$promise.then(setDataSource);
  }, [query.data_source_id]);
  return (
    <div className="query-page-wrapper">
      <div className="container">
        <QueryPageHeader query={query} onChange={setQuery} />
        <div className="query-metadata tiled bg-white p-15">
          <EditInPlace
            className="w-100"
            value={query.description}
            isEditable={query.can_edit}
            onDone={description => updateQueryDescription(query, description).then(setQuery)}
            placeholder="Add description"
            ignoreBlanks={false}
            editorProps={{ autosize: { minRows: 2, maxRows: 4 } }}
            multiline
          />
          <Divider />
          <QueryMetadata
            layout="horizontal"
            query={query}
            dataSource={dataSource}
            onEditSchedule={openScheduleDialog}
          />
        </div>
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
        <div className="query-content tiled bg-white p-15 m-t-15">
          {query.hasParameters() && (
            <Parameters
              parameters={parameters}
              onValuesChange={() => {
                setDirtyParameters(false);
                executeQuery();
              }}
              onPendingValuesChange={() => setDirtyParameters(query.$parameters.hasPendingValues())}
            />
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
            onDeleteVisualization={visualization => deleteQueryVisualization(query, visualization).then(setQuery)}
          />
          <Divider />
          <div className="d-flex align-items-center">
            {queryResultData.status === "done" && (
              <>
                <EditVisualizationButton
                  selectedTab={selectedTab}
                  openVisualizationEditor={visId =>
                    editQueryVisualization(
                      query,
                      queryResult,
                      find(query.visualizations, { id: visId })
                    ).then(({ query }) => setQuery(query))
                  }
                />
                <QueryControlDropdown
                  query={query}
                  queryResult={queryResult}
                  queryExecuting={isQueryExecuting}
                  showEmbedDialog={() => EmbedQueryDialog.showModal({ query, visualization: currentVisualization })}
                  openAddToDashboardForm={() =>
                    AddToDashboardDialog.showModal({
                      visualization: currentVisualization,
                    })
                  }
                />
                <span className="m-l-10">
                  <strong>{queryResultData.rows.length}</strong> {pluralize("row", queryResultData.rows.length)}
                </span>
                <span className="m-l-10">
                  <strong>{durationHumanize(queryResult.getRuntime())}</strong>
                  <span className="hidden-xs"> runtime</span>
                </span>
              </>
            )}
            <span className="flex-fill" />
            {queryResultData.status === "done" && (
              <span className="m-r-10 hidden-xs">
                Updated <TimeAgo date={queryResult.query_result.retrieved_at} />
              </span>
            )}
            <Button type="primary" loading={isQueryExecuting} disabled={dirtyParameters} onClick={executeQuery}>
              Execute
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

QueryView.propTypes = { query: PropTypes.object.isRequired }; // eslint-disable-line react/forbid-prop-types

export default function init(ngModule) {
  ngModule.component("pageQueryView", react2angular(QueryView));

  return {
    "/queries-react/:queryId": {
      template: '<page-query-view query="$resolve.query"></page-query-view>',
      reloadOnSearch: false,
      resolve: {
        query: (Query, $route) => {
          "ngInject";

          return Query.get({ id: $route.current.params.queryId }).$promise;
        },
      },
    },
  };
}

init.init = true;
