import React, { useState } from "react";
import { compact, isEmpty, invoke } from "lodash";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'mark... Remove this comment to see the full error message
import { markdown } from "markdown";
import cx from "classnames";
import Menu from "antd/lib/menu";
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
import { currentUser } from "@/services/auth";
import recordEvent from "@/services/recordEvent";
import { formatDateTime } from "@/lib/utils";
import Link from "@/components/Link";
import Parameters from "@/components/Parameters";
import TimeAgo from "@/components/TimeAgo";
import Timer from "@/components/Timer";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";
import QueryLink from "@/components/QueryLink";
// @ts-expect-error ts-migrate(6133) FIXME: 'FiltersType' is declared but its value is never r... Remove this comment to see the full error message
import { FiltersType } from "@/components/Filters";
import ExpandedWidgetDialog from "@/components/dashboards/ExpandedWidgetDialog";
import EditParameterMappingsDialog from "@/components/dashboards/EditParameterMappingsDialog";
import VisualizationRenderer from "@/components/visualizations/VisualizationRenderer";
import Widget from "./Widget";

function visualizationWidgetMenuOptions({
  widget,
  canEditDashboard,
  onParametersEdit
}: any) {
  const canViewQuery = currentUser.hasPermission("view_query");
  const canEditParameters = canEditDashboard && !isEmpty(invoke(widget, "query.getParametersDefs"));
  const widgetQueryResult = widget.getQueryResult();
  const isQueryResultEmpty = !widgetQueryResult || !widgetQueryResult.isEmpty || widgetQueryResult.isEmpty();

  const downloadLink = (fileType: any) => widgetQueryResult.getLink(widget.getQuery().id, fileType);
  const downloadName = (fileType: any) => widgetQueryResult.getName(widget.getQuery().name, fileType);
  return compact([
    <Menu.Item key="download_csv" disabled={isQueryResultEmpty}>
      {!isQueryResultEmpty ? (
        <Link href={downloadLink("csv")} download={downloadName("csv")} target="_self">
          Download as CSV File
        </Link>
      ) : (
        "Download as CSV File"
      )}
    </Menu.Item>,
    <Menu.Item key="download_tsv" disabled={isQueryResultEmpty}>
      {!isQueryResultEmpty ? (
        <Link href={downloadLink("tsv")} download={downloadName("tsv")} target="_self">
          Download as TSV File
        </Link>
      ) : (
        "Download as TSV File"
      )}
    </Menu.Item>,
    <Menu.Item key="download_excel" disabled={isQueryResultEmpty}>
      {!isQueryResultEmpty ? (
        <Link href={downloadLink("xlsx")} download={downloadName("xlsx")} target="_self">
          Download as Excel File
        </Link>
      ) : (
        "Download as Excel File"
      )}
    </Menu.Item>,
    (canViewQuery || canEditParameters) && <Menu.Divider key="divider" />,
    canViewQuery && (
      <Menu.Item key="view_query">
        <Link href={widget.getQuery().getUrl(true, widget.visualization.id)}>View Query</Link>
      </Menu.Item>
    ),
    canEditParameters && (
      <Menu.Item key="edit_parameters" onClick={onParametersEdit}>
        Edit Parameters
      </Menu.Item>
    ),
  ]);
}

type OwnRefreshIndicatorProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    refreshStartedAt?: Moment;
};

type RefreshIndicatorProps = OwnRefreshIndicatorProps & typeof RefreshIndicator.defaultProps;

function RefreshIndicator({ refreshStartedAt }: RefreshIndicatorProps) {
  return (
    <div className="refresh-indicator">
      <div className="refresh-icon">
        <i className="zmdi zmdi-refresh zmdi-hc-spin" />
      </div>
      <Timer from={refreshStartedAt} />
    </div>
  );
}
RefreshIndicator.defaultProps = { refreshStartedAt: null };

type OwnVisualizationWidgetHeaderProps = {
    widget: any;
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    refreshStartedAt?: Moment;
    parameters?: any[];
    onParametersUpdate?: (...args: any[]) => any;
};

type VisualizationWidgetHeaderProps = OwnVisualizationWidgetHeaderProps & typeof VisualizationWidgetHeader.defaultProps;

function VisualizationWidgetHeader({ widget, refreshStartedAt, parameters, onParametersUpdate }: VisualizationWidgetHeaderProps) {
  const canViewQuery = currentUser.hasPermission("view_query");

  return (
    <>
      <RefreshIndicator refreshStartedAt={refreshStartedAt} />
      <div className="t-header widget clearfix">
        <div className="th-title">
          <p>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'. */}
            <QueryLink query={widget.getQuery()} visualization={widget.visualization} readOnly={!canViewQuery} />
          </p>
          {!isEmpty(widget.getQuery().description) && (
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: any; className: string; }' is no... Remove this comment to see the full error message
            <HtmlContent className="text-muted markdown query--description">
              {markdown.toHTML(widget.getQuery().description || "")}
            </HtmlContent>
          )}
        </div>
      </div>
      {!isEmpty(parameters) && (
        <div className="m-b-10">
          <Parameters parameters={parameters} onValuesChange={onParametersUpdate} />
        </div>
      )}
    </>
  );
}

VisualizationWidgetHeader.defaultProps = {
  refreshStartedAt: null,
  onParametersUpdate: () => {},
  parameters: [],
};

type OwnVisualizationWidgetFooterProps = {
    widget: any;
    isPublic?: boolean;
    onRefresh: (...args: any[]) => any;
    onExpand: (...args: any[]) => any;
};

type VisualizationWidgetFooterProps = OwnVisualizationWidgetFooterProps & typeof VisualizationWidgetFooter.defaultProps;

function VisualizationWidgetFooter({ widget, isPublic, onRefresh, onExpand }: VisualizationWidgetFooterProps) {
  const widgetQueryResult = widget.getQueryResult();
  const updatedAt = invoke(widgetQueryResult, "getUpdatedAt");
  const [refreshClickButtonId, setRefreshClickButtonId] = useState();

  const refreshWidget = (buttonId: any) => {
    if (!refreshClickButtonId) {
      setRefreshClickButtonId(buttonId);
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
      onRefresh().finally(() => setRefreshClickButtonId(null));
    }
  };

  return widgetQueryResult ? (
    <>
      <span>
        {!isPublic && !!widgetQueryResult && (
          <a
            className="refresh-button hidden-print btn btn-sm btn-default btn-transparent"
            onClick={() => refreshWidget(1)}
            data-test="RefreshButton">
            <i className={cx("zmdi zmdi-refresh", { "zmdi-hc-spin": refreshClickButtonId === 1 })} />{" "}
            <TimeAgo date={updatedAt} />
          </a>
        )}
        <span className="visible-print">
          <i className="zmdi zmdi-time-restore" /> {formatDateTime(updatedAt)}
        </span>
        {isPublic && (
          <span className="small hidden-print">
            <i className="zmdi zmdi-time-restore" /> <TimeAgo date={updatedAt} />
          </span>
        )}
      </span>
      <span>
        {!isPublic && (
          <a
            className="btn btn-sm btn-default hidden-print btn-transparent btn__refresh"
            onClick={() => refreshWidget(2)}>
            <i className={cx("zmdi zmdi-refresh", { "zmdi-hc-spin": refreshClickButtonId === 2 })} />
          </a>
        )}
        <a className="btn btn-sm btn-default hidden-print btn-transparent btn__refresh" onClick={onExpand}>
          <i className="zmdi zmdi-fullscreen" />
        </a>
      </span>
    </>
  ) : null;
}

VisualizationWidgetFooter.defaultProps = { isPublic: false };

type OwnVisualizationWidgetProps = {
    widget: any;
    dashboard: any;
    // @ts-expect-error ts-migrate(2749) FIXME: 'FiltersType' refers to a value, but is being used... Remove this comment to see the full error message
    filters?: FiltersType;
    isPublic?: boolean;
    isLoading?: boolean;
    canEdit?: boolean;
    onLoad?: (...args: any[]) => any;
    onRefresh?: (...args: any[]) => any;
    onDelete?: (...args: any[]) => any;
    onParameterMappingsChange?: (...args: any[]) => any;
};

type VisualizationWidgetState = any;

type VisualizationWidgetProps = OwnVisualizationWidgetProps & typeof VisualizationWidget.defaultProps;

class VisualizationWidget extends React.Component<VisualizationWidgetProps, VisualizationWidgetState> {

  static defaultProps = {
    filters: [],
    isPublic: false,
    isLoading: false,
    canEdit: false,
    onLoad: () => {},
    onRefresh: () => {},
    onDelete: () => {},
    onParameterMappingsChange: () => {},
  };

  constructor(props: VisualizationWidgetProps) {
    super(props);
    this.state = {
      localParameters: props.widget.getLocalParameters(),
      localFilters: props.filters,
    };
  }

  componentDidMount() {
    const { widget, onLoad } = this.props;
    recordEvent("view", "query", widget.visualization.query.id, { dashboard: true });
    recordEvent("view", "visualization", widget.visualization.id, { dashboard: true });
    onLoad();
  }

  onLocalFiltersChange = (localFilters: any) => {
    this.setState({ localFilters });
  };

  expandWidget = () => {
    ExpandedWidgetDialog.showModal({ widget: this.props.widget, filters: this.state.localFilters });
  };

  editParameterMappings = () => {
    const { widget, dashboard, onRefresh, onParameterMappingsChange } = this.props;
    EditParameterMappingsDialog.showModal({
      dashboard,
      widget,
    }).onClose((valuesChanged: any) => {
      // refresh widget if any parameter value has been updated
      if (valuesChanged) {
        onRefresh();
      }
      onParameterMappingsChange();
      this.setState({ localParameters: widget.getLocalParameters() });
    });
  };

  renderVisualization() {
    const { widget, filters } = this.props;
    const widgetQueryResult = widget.getQueryResult();
    const widgetStatus = widgetQueryResult && widgetQueryResult.getStatus();
    switch (widgetStatus) {
      case "failed":
        return (
          <div className="body-row-auto scrollbox">
            {widgetQueryResult.getError() && (
              <div className="alert alert-danger m-5">
                Error running query: <strong>{widgetQueryResult.getError()}</strong>
              </div>
            )}
          </div>
        );
      case "done":
        return (
          <div className="body-row-auto scrollbox">
            <VisualizationRenderer
              visualization={widget.visualization}
              queryResult={widgetQueryResult}
              filters={filters}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '(localFilters: any) => void' is not assignab... Remove this comment to see the full error message
              onFiltersChange={this.onLocalFiltersChange}
              context="widget"
            />
          </div>
        );
      default:
        return (
          <div className="body-row-auto spinner-container">
            <div className="spinner">
              <i className="zmdi zmdi-refresh zmdi-hc-spin zmdi-hc-5x" />
            </div>
          </div>
        );
    }
  }

  render() {
    const { widget, isLoading, isPublic, canEdit, onRefresh } = this.props;
    const { localParameters } = this.state;
    const widgetQueryResult = widget.getQueryResult();
    const isRefreshing = isLoading && !!(widgetQueryResult && widgetQueryResult.getStatus());

    return (
      // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
      <Widget
        {...this.props}
        className="widget-visualization"
        menuOptions={visualizationWidgetMenuOptions({
          widget,
          canEditDashboard: canEdit,
          onParametersEdit: this.editParameterMappings,
        })}
        header={
          <VisualizationWidgetHeader
            widget={widget}
            refreshStartedAt={isRefreshing ? widget.refreshStartedAt : null}
            parameters={localParameters}
            onParametersUpdate={onRefresh}
          />
        }
        footer={
          <VisualizationWidgetFooter
            widget={widget}
            isPublic={isPublic}
            onRefresh={onRefresh}
            onExpand={this.expandWidget}
          />
        }
        tileProps={{ "data-refreshing": isRefreshing }}>
        {this.renderVisualization()}
      </Widget>
    );
  }
}

export default VisualizationWidget;
