import { find, has } from "lodash";
import React, { useState, useEffect, useCallback } from "react";
import moment from "moment";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'mark... Remove this comment to see the full error message
import { markdown } from "markdown";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Tooltip from "antd/lib/tooltip";
import Link from "@/components/Link";
import routeWithApiKeySession from "@/components/ApplicationArea/routeWithApiKeySession";
import Parameters from "@/components/Parameters";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";
import TimeAgo from "@/components/TimeAgo";
import Timer from "@/components/Timer";
import QueryResultsLink from "@/components/EditVisualizationButton/QueryResultsLink";
import VisualizationName from "@/components/visualizations/VisualizationName";
import VisualizationRenderer from "@/components/visualizations/VisualizationRenderer";
import FileOutlinedIcon from "@ant-design/icons/FileOutlined";
import FileExcelOutlinedIcon from "@ant-design/icons/FileExcelOutlined";
import { VisualizationType } from "@redash/viz/lib";
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
import { formatDateTime } from "@/lib/utils";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import { Query } from "@/services/query";
import location from "@/services/location";
import routes from "@/services/routes";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '@/assets/images/redash_icon_sm... Remove this comment to see the full error message
import logoUrl from "@/assets/images/redash_icon_small.png";
type OwnVisualizationEmbedHeaderProps = {
    queryName: string;
    queryDescription?: string;
    visualization: VisualizationType;
};
type VisualizationEmbedHeaderProps = OwnVisualizationEmbedHeaderProps & typeof VisualizationEmbedHeader.defaultProps;
function VisualizationEmbedHeader({ queryName, queryDescription, visualization }: VisualizationEmbedHeaderProps) {
    return (<div className="embed-heading p-b-10 p-r-15 p-l-15">
      <h3>
        <img src={logoUrl} alt="Redash Logo" style={{ height: "24px", verticalAlign: "text-bottom" }}/>
        <VisualizationName visualization={visualization}/> {queryName}
        {queryDescription && (<small>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: any; className: string; }' is no... Remove this comment to see the full error message */}
            <HtmlContent className="markdown text-muted">{markdown.toHTML(queryDescription || "")}</HtmlContent>
          </small>)}
      </h3>
    </div>);
}
VisualizationEmbedHeader.defaultProps = { queryDescription: "" };
type OwnVisualizationEmbedFooterProps = {
    query: any;
    queryResults?: any;
    updatedAt?: string;
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    refreshStartedAt?: Moment;
    queryUrl?: string;
    hideTimestamp?: boolean;
    apiKey?: string;
};
type VisualizationEmbedFooterProps = OwnVisualizationEmbedFooterProps & typeof VisualizationEmbedFooter.defaultProps;
function VisualizationEmbedFooter({ query, queryResults, updatedAt, refreshStartedAt, queryUrl, hideTimestamp, apiKey, }: VisualizationEmbedFooterProps) {
    const downloadMenu = (<Menu>
      <Menu.Item>
        <QueryResultsLink fileType="csv" query={query} queryResult={queryResults} apiKey={apiKey} disabled={!queryResults || !(queryResults as any).getData || !(queryResults as any).getData()} embed>
          <FileOutlinedIcon /> Download as CSV File
        </QueryResultsLink>
      </Menu.Item>
      <Menu.Item>
        <QueryResultsLink fileType="tsv" query={query} queryResult={queryResults} apiKey={apiKey} disabled={!queryResults || !(queryResults as any).getData || !(queryResults as any).getData()} embed>
          <FileOutlinedIcon /> Download as TSV File
        </QueryResultsLink>
      </Menu.Item>
      <Menu.Item>
        <QueryResultsLink fileType="xlsx" query={query} queryResult={queryResults} apiKey={apiKey} disabled={!queryResults || !(queryResults as any).getData || !(queryResults as any).getData()} embed>
          <FileExcelOutlinedIcon /> Download as Excel File
        </QueryResultsLink>
      </Menu.Item>
    </Menu>);
    return (<div className="tile__bottom-control">
      {!hideTimestamp && (<span>
          <a className="small hidden-print">
            <i className="zmdi zmdi-time-restore"/>{" "}
            {refreshStartedAt ? <Timer from={refreshStartedAt}/> : <TimeAgo date={updatedAt}/>}
          </a>
          <span className="small visible-print">
            <i className="zmdi zmdi-time-restore"/> {formatDateTime(updatedAt)}
          </span>
        </span>)}
      {queryUrl && (<span className="hidden-print">
          <Tooltip title="Open in Redash">
            <Link.Button className="icon-button" href={queryUrl} target="_blank">
              <i className="fa fa-external-link"/>
            </Link.Button>
          </Tooltip>
          {!(query as any).hasParameters() && (<Dropdown overlay={downloadMenu} disabled={!queryResults} trigger={["click"]} placement="topLeft">
              <Button loading={!queryResults && !!refreshStartedAt} className="m-l-5">
                Download Dataset
                <i className="fa fa-caret-up m-l-5"/>
              </Button>
            </Dropdown>)}
        </span>)}
    </div>);
}
VisualizationEmbedFooter.defaultProps = {
    queryResults: null,
    updatedAt: null,
    refreshStartedAt: null,
    queryUrl: null,
    hideTimestamp: false,
    apiKey: null,
};
type OwnVisualizationEmbedProps = {
    queryId: string;
    visualizationId?: string;
    apiKey: string;
    onError?: (...args: any[]) => any;
};
type VisualizationEmbedProps = OwnVisualizationEmbedProps & typeof VisualizationEmbed.defaultProps;
function VisualizationEmbed({ queryId, visualizationId, apiKey, onError }: VisualizationEmbedProps) {
    const [query, setQuery] = useState(null);
    const [error, setError] = useState(null);
    const [refreshStartedAt, setRefreshStartedAt] = useState(null);
    const [queryResults, setQueryResults] = useState(null);
    const handleError = useImmutableCallback(onError);
    useEffect(() => {
        let isCancelled = false;
        (Query as any).get({ id: queryId })
            .then((result: any) => {
            if (!isCancelled) {
                setQuery(result);
            }
        })
            .catch(handleError);
        return () => {
            isCancelled = true;
        };
    }, [queryId, handleError]);
    const refreshQueryResults = useCallback(() => {
        if (query) {
            setError(null);
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Moment' is not assignable to par... Remove this comment to see the full error message
            setRefreshStartedAt(moment());
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            query
                .getQueryResultPromise()
                .then((result: any) => {
                setQueryResults(result);
            })
                .catch((err: any) => {
                setError(err.getError());
            })
                .finally(() => setRefreshStartedAt(null));
        }
    }, [query]);
    useEffect(() => {
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        document.querySelector("body").classList.add("headless");
        refreshQueryResults();
    }, [refreshQueryResults]);
    if (!query) {
        return null;
    }
    const hideHeader = has(location.search, "hide_header");
    const hideParametersUI = has(location.search, "hide_parameters");
    const hideQueryLink = has(location.search, "hide_link");
    const hideTimestamp = has(location.search, "hide_timestamp");
    const showQueryDescription = has(location.search, "showDescription");
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'string | ... Remove this comment to see the full error message
    visualizationId = parseInt(visualizationId, 10);
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const visualization = find(query.visualizations, vis => vis.id === visualizationId);
    if (!visualization) {
        // call error handler async, otherwise it will destroy the component on render phase
        setTimeout(() => {
            onError(new Error("Visualization does not exist"));
        }, 10);
        return null;
    }
    return (<div className="tile m-t-10 m-l-10 m-r-10 p-t-10 embed__vis" data-test="VisualizationEmbed">
      {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
      {!hideHeader && (<VisualizationEmbedHeader queryName={query.name} queryDescription={showQueryDescription ? query.description : null} visualization={visualization}/>)}
      <div className="col-md-12 query__vis">
        {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
        {!hideParametersUI && query.hasParameters() && (<div className="p-t-15 p-b-10">
            {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
            <Parameters parameters={query.getParametersDefs()} onValuesChange={refreshQueryResults}/>
          </div>)}
        {error && <div className="alert alert-danger" data-test="ErrorMessage">{`Error: ${error}`}</div>}
        {!error && queryResults && (<VisualizationRenderer visualization={visualization} queryResult={queryResults} context="widget"/>)}
        {!queryResults && refreshStartedAt && (<div className="d-flex justify-content-center">
            <div className="spinner">
              <i className="zmdi zmdi-refresh zmdi-hc-spin zmdi-hc-5x"/>
            </div>
          </div>)}
      </div>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'never'. */}
      <VisualizationEmbedFooter query={query} queryResults={queryResults} updatedAt={queryResults ? queryResults.getUpdatedAt() : undefined} refreshStartedAt={refreshStartedAt} queryUrl={!hideQueryLink ? query.getUrl() : null} hideTimestamp={hideTimestamp} apiKey={apiKey}/>
    </div>);
}
VisualizationEmbed.defaultProps = {
    onError: () => { },
};
routes.register("Visualizations.ViewShared", routeWithApiKeySession({
    path: "/embed/query/:queryId/visualization/:visualizationId",
    render: (pageProps: any) => <VisualizationEmbed {...pageProps}/>,
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    getApiKey: () => location.search.api_key,
}));
