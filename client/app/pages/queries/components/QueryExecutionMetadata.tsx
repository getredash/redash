import React from "react";
import TimeAgo from "@/components/TimeAgo";
import useAddToDashboardDialog from "../hooks/useAddToDashboardDialog";
import useEmbedDialog from "../hooks/useEmbedDialog";
import QueryControlDropdown from "@/components/EditVisualizationButton/QueryControlDropdown";
import EditVisualizationButton from "@/components/EditVisualizationButton";
import useQueryResultData from "@/lib/useQueryResultData";
import { durationHumanize, pluralize, prettySize } from "@/lib/utils";
import "./QueryExecutionMetadata.less";
type OwnProps = {
    query: any;
    queryResult: any;
    isQueryExecuting?: boolean;
    selectedVisualization?: number;
    showEditVisualizationButton?: boolean;
    onEditVisualization?: (...args: any[]) => any;
    extraActions?: React.ReactNode;
};
type Props = OwnProps & typeof QueryExecutionMetadata.defaultProps;
export default function QueryExecutionMetadata({ query, queryResult, isQueryExecuting, selectedVisualization, showEditVisualizationButton, onEditVisualization, extraActions, }: Props) {
    const queryResultData = useQueryResultData(queryResult);
    const openAddToDashboardDialog = useAddToDashboardDialog(query);
    const openEmbedDialog = useEmbedDialog(query);
    return (<div className="query-execution-metadata">
      <span className="m-r-5">
        <QueryControlDropdown query={query} queryResult={queryResult} queryExecuting={isQueryExecuting} showEmbedDialog={openEmbedDialog} embed={false} apiKey={(query as any).api_key} selectedTab={selectedVisualization} openAddToDashboardForm={openAddToDashboardDialog}/>
      </span>
      {extraActions}
      {showEditVisualizationButton && (<EditVisualizationButton openVisualizationEditor={onEditVisualization} selectedTab={selectedVisualization}/>)}
      <span className="m-l-5 m-r-10">
        <span>
          <strong>{queryResultData.rows.length}</strong> {pluralize("row", queryResultData.rows.length)}
        </span>
        <span className="m-l-5">
          {!isQueryExecuting && (<React.Fragment>
              <strong>{durationHumanize(queryResultData.runtime)}</strong>
              <span className="hidden-xs"> runtime</span>
            </React.Fragment>)}
          {isQueryExecuting && <span>Running&hellip;</span>}
        </span>
        {queryResultData.metadata.data_scanned && (<span className="m-l-5">
            Data Scanned
            <strong>{prettySize(queryResultData.metadata.data_scanned)}</strong>
          </span>)}
      </span>
      <div>
        <span className="m-r-10">
          <span className="hidden-xs">Refreshed </span>
          <strong>
            <TimeAgo date={queryResultData.retrievedAt} placeholder="-"/>
          </strong>
        </span>
      </div>
    </div>);
}
QueryExecutionMetadata.defaultProps = {
    isQueryExecuting: false,
    selectedVisualization: null,
    showEditVisualizationButton: false,
    onEditVisualization: () => { },
    extraActions: null,
};
