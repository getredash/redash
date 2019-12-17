import React, { useMemo, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { find } from "lodash";
import { react2angular } from "react2angular";
import Divider from "antd/lib/divider";
import Button from "antd/lib/button";
import { EditInPlace } from "@/components/EditInPlace";
import { Parameters } from "@/components/Parameters";
import { TimeAgo } from "@/components/TimeAgo";
import { SchedulePhrase } from "@/components/queries/SchedulePhrase";
import { QueryControlDropdown } from "@/components/EditVisualizationButton/QueryControlDropdown";
import EmbedQueryDialog from "@/components/queries/EmbedQueryDialog";
import AddToDashboardDialog from "@/components/queries/AddToDashboardDialog";
import EditVisualizationDialog from "@/visualizations/EditVisualizationDialog";
import QueryPageHeader from "./components/QueryPageHeader";

import { IMG_ROOT, DataSource } from "@/services/data-source";
import recordEvent from "@/services/recordEvent";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import { EditVisualizationButton } from "@/components/EditVisualizationButton";
import useQueryResult from "@/lib/hooks/useQueryResult";
import { pluralize, durationHumanize } from "@/filters";
import { updateQuery } from "./utils";

import "./query-view.less";
import useVisualizationTabHandler from "./utils/useVisualizationTabHandler";

function QueryView(props) {
  const [query, setQuery] = useState(props.query);
  const [selectedTab, setSelectedTab] = useVisualizationTabHandler(query.visualizations);
  const currentVisualization = useMemo(() => find(query.visualizations, { id: selectedTab }), [
    query.visualizations,
    selectedTab,
  ]);
  const parameters = useMemo(() => query.getParametersDefs(), [query]);
  const [dataSource, setDataSource] = useState();
  const queryResult = useMemo(() => query.getQueryResult(), [query]);
  const queryResultData = useQueryResult(queryResult);

  const saveDescription = useCallback(
    description => {
      recordEvent("edit_description", "query", query.id);
      updateQuery(query, { description }).then(setQuery);
    },
    [query]
  );

  const openVisualizationEditor = useCallback(() => {
    EditVisualizationDialog.showModal({
      query,
      visualization: currentVisualization,
      queryResult,
    }).result.then(visualization => {
      setSelectedTab(visualization.id);
      // TODO: Properly update state
    });
  }, [currentVisualization, query, queryResult, setSelectedTab]);

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
            onDone={saveDescription}
            editor="textarea"
            placeholder="Add description"
            ignoreBlanks={false}
          />
          <Divider />
          <div className="query-property-list">
            <div className="query-property">
              <img src={query.user.profile_image_url} className="profile__image_thumb" alt={query.user.name} />
              <strong>{query.user.name}</strong>
              {" created "}
              <TimeAgo date={query.created_at} />
            </div>
            <div className="query-property">
              <img
                src={query.last_modified_by.profile_image_url}
                className="profile__image_thumb"
                alt={query.last_modified_by.name}
              />
              <strong>{query.last_modified_by.name}</strong>
              {" updated "}
              <TimeAgo date={query.updated_at} />
            </div>
            {dataSource && (
              <div className="query-property">
                <img src={`${IMG_ROOT}/${dataSource.type}.png`} width="20" alt={dataSource.type} />
                {dataSource.name}
              </div>
            )}
            <span className="flex-fill" />
            <div className="query-property">
              <i className="zmdi zmdi-refresh m-r-5" />
              Refresh Schedule
              <a className="clickable m-l-5">
                <SchedulePhrase schedule={query.schedule} isNew={false} />
              </a>
            </div>
          </div>
        </div>
        <div className="query-content tiled bg-white p-15 m-t-15">
          {query.hasParameters() && <Parameters parameters={parameters} />}
          <QueryVisualizationTabs
            queryResult={queryResult}
            visualizations={query.visualizations}
            showNewVisualizationButton={query.can_edit}
            selectedTab={selectedTab}
            onChangeTab={setSelectedTab}
            onClickNewVisualization={openVisualizationEditor}
          />
          <Divider />
          <div className="d-flex align-items-center">
            <EditVisualizationButton selectedTab={selectedTab} openVisualizationEditor={openVisualizationEditor} />
            <QueryControlDropdown
              query={query}
              queryResult={queryResult}
              queryExecuting={false} /* TODO: Replace with executing state */
              showEmbedDialog={() => EmbedQueryDialog.showEmbedDialog({ query, visualization: currentVisualization })}
              openAddToDashboardForm={() =>
                AddToDashboardDialog.showModal({
                  visualization: currentVisualization,
                })
              }
            />
            {queryResult && queryResultData && (
              <>
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
            {queryResult && (
              <span className="m-r-10 hidden-xs">
                Updated <TimeAgo date={queryResult.query_result.retrieved_at} />
              </span>
            )}
            <Button type="primary">Execute</Button>
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
