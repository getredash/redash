import React, { useState } from "react";
import PropTypes from "prop-types";
import { compact, isEmpty, invoke, map } from "lodash";
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
import { Moment } from "@/components/proptypes";
import QueryLink from "@/components/QueryLink";
import { FiltersType } from "@/components/Filters";
import PlainButton from "@/components/PlainButton";
import ExpandedWidgetDialog from "@/components/dashboards/ExpandedWidgetDialog";
import EditParameterMappingsDialog from "@/components/dashboards/EditParameterMappingsDialog";
import VisualizationRenderer from "@/components/visualizations/VisualizationRenderer";

import Widget from "./Widget";

function visualizationWidgetMenuOptions({ widget, canEditDashboard, onParametersEdit }) {
  const canViewQuery = currentUser.hasPermission("view_query");
  const canEditParameters = canEditDashboard && !isEmpty(invoke(widget, "query.getParametersDefs"));
  const widgetQueryResult = widget.getQueryResult();
  const isQueryResultEmpty = !widgetQueryResult || !widgetQueryResult.isEmpty || widgetQueryResult.isEmpty();

  const downloadLink = fileType => widgetQueryResult.getLink(widget.getQuery().id, fileType);
  const downloadName = fileType => widgetQueryResult.getName(widget.getQuery().name, fileType);
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

function RefreshIndicator({ refreshStartedAt }) {
  return (
    <div className="refresh-indicator">
      <div className="refresh-icon">
        <i className="zmdi zmdi-refresh zmdi-hc-spin" aria-hidden="true" />
        <span className="sr-only">Refreshing...</span>
      </div>
      <Timer from={refreshStartedAt} />
    </div>
  );
}

RefreshIndicator.propTypes = { refreshStartedAt: Moment };
RefreshIndicator.defaultProps = { refreshStartedAt: null };

function VisualizationWidgetHeader({
  widget,
  refreshStartedAt,
  parameters,
  isEditing,
  onParametersUpdate,
  onParametersEdit,
}) {
  const canViewQuery = currentUser.hasPermission("view_query");

  return (
    <>
      <RefreshIndicator refreshStartedAt={refreshStartedAt} />
      <div className="t-header widget clearfix">
        <div className="th-title">
          <p>
            <QueryLink query={widget.getQuery()} visualization={widget.visualization} readOnly={!canViewQuery} />
          </p>
          {!isEmpty(widget.getQuery().description) && (
            <HtmlContent className="text-muted markdown query--description">
              {markdown.toHTML(widget.getQuery().description || "")}
            </HtmlContent>
          )}
        </div>
      </div>
      {!isEmpty(parameters) && (
        <div className="m-b-10">
          <Parameters
            parameters={parameters}
            sortable={isEditing}
            appendSortableToParent={false}
            onValuesChange={onParametersUpdate}
            onParametersEdit={onParametersEdit}
          />
        </div>
      )}
    </>
  );
}

VisualizationWidgetHeader.propTypes = {
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  refreshStartedAt: Moment,
  parameters: PropTypes.arrayOf(PropTypes.object),
  isEditing: PropTypes.bool,
  onParametersUpdate: PropTypes.func,
  onParametersEdit: PropTypes.func,
};

VisualizationWidgetHeader.defaultProps = {
  refreshStartedAt: null,
  onParametersUpdate: () => {},
  onParametersEdit: () => {},
  isEditing: false,
  parameters: [],
};

function VisualizationWidgetFooter({ widget, isPublic, onRefresh, onExpand }) {
  const widgetQueryResult = widget.getQueryResult();
  const updatedAt = invoke(widgetQueryResult, "getUpdatedAt");
  const [refreshClickButtonId, setRefreshClickButtonId] = useState();

  const refreshWidget = buttonId => {
    if (!refreshClickButtonId) {
      setRefreshClickButtonId(buttonId);
      onRefresh().finally(() => setRefreshClickButtonId(null));
    }
  };

  return widgetQueryResult ? (
    <>
      <span>
        {!isPublic && !!widgetQueryResult && (
          <span className="btn__refresh">
            <PlainButton
              className="refresh-button hidden-print btn btn-sm btn-default btn-transparent"
              onClick={() => refreshWidget(1)}
              data-test="RefreshButton">
              <i
                className={cx("zmdi zmdi-refresh", { "zmdi-hc-spin": refreshClickButtonId === 1 })}
                aria-hidden="true"
              />
              <span className="sr-only">
                {refreshClickButtonId === 1 ? "Refreshing, please wait. " : "Press to refresh. "}
              </span>{" "}
              <TimeAgo date={updatedAt} />
            </PlainButton>
          </span>
        )}
        <span className="visible-print">
          <i className="zmdi zmdi-time-restore" aria-hidden="true" /> {formatDateTime(updatedAt)}
        </span>
        {isPublic && (
          <span className="small hidden-print btn__refresh">
            <i className="zmdi zmdi-time-restore" aria-hidden="true" /> <TimeAgo date={updatedAt} />
          </span>
        )}
      </span>
      <span>
        {!isPublic && (
          <PlainButton
            className="btn btn-sm btn-default hidden-print btn-transparent btn__refresh"
            onClick={() => refreshWidget(2)}>
            <i className={cx("zmdi zmdi-refresh", { "zmdi-hc-spin": refreshClickButtonId === 2 })} aria-hidden="true" />
            <span className="sr-only">
              {refreshClickButtonId === 2 ? "Refreshing, please wait." : "Press to refresh."}
            </span>
          </PlainButton>
        )}
        <PlainButton className="btn btn-sm btn-default hidden-print btn-transparent btn__refresh" onClick={onExpand}>
          <i className="zmdi zmdi-fullscreen" aria-hidden="true" />
        </PlainButton>
      </span>
    </>
  ) : null;
}

VisualizationWidgetFooter.propTypes = {
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  isPublic: PropTypes.bool,
  onRefresh: PropTypes.func.isRequired,
  onExpand: PropTypes.func.isRequired,
};

VisualizationWidgetFooter.defaultProps = { isPublic: false };

class VisualizationWidget extends React.Component {
  static propTypes = {
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    filters: FiltersType,
    isPublic: PropTypes.bool,
    isLoading: PropTypes.bool,
    canEdit: PropTypes.bool,
    isEditing: PropTypes.bool,
    onLoad: PropTypes.func,
    onRefresh: PropTypes.func,
    onDelete: PropTypes.func,
    onParameterMappingsChange: PropTypes.func,
  };

  static defaultProps = {
    filters: [],
    isPublic: false,
    isLoading: false,
    canEdit: false,
    isEditing: false,
    onLoad: () => {},
    onRefresh: () => {},
    onDelete: () => {},
    onParameterMappingsChange: () => {},
  };

  constructor(props) {
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

  onLocalFiltersChange = localFilters => {
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
    }).onClose(valuesChanged => {
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
              onFiltersChange={this.onLocalFiltersChange}
              context="widget"
            />
          </div>
        );
      default:
        return (
          <div className="spinner-container">
            <svg
              className="animate-spin"
              height={64}
              width={64}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 121 120">
              <g clipPath="url(#clip0_1390_17926)">
                <path
                  opacity="0.8"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M60 11.25C47.0707 11.25 34.6709 16.3861 25.5285 25.5285C16.3861 34.6709 11.25 47.0707 11.25 60C11.25 72.9293 16.3861 85.3291 25.5285 94.4715C34.6709 103.614 47.0707 108.75 60 108.75C72.9293 108.75 85.3291 103.614 94.4715 94.4715C103.614 85.3291 108.75 72.9293 108.75 60C108.75 47.0707 103.614 34.6709 94.4715 25.5285C85.3291 16.3861 72.9293 11.25 60 11.25ZM0 60C0 44.087 6.32141 28.8258 17.5736 17.5736C28.8258 6.32141 44.087 0 60 0C75.913 0 91.1742 6.32141 102.426 17.5736C113.679 28.8258 120 44.087 120 60C120 75.913 113.679 91.1742 102.426 102.426C91.1742 113.679 75.913 120 60 120C44.087 120 28.8258 113.679 17.5736 102.426C6.32141 91.1742 0 75.913 0 60Z"
                  fill="#EDF4FD"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M54.375 5.625C54.375 4.13316 54.9676 2.70242 56.0225 1.64752C57.0774 0.592632 58.5082 0 60 0C75.913 0 91.1742 6.32141 102.426 17.5736C113.679 28.8258 120 44.087 120 60C120 61.4918 119.407 62.9226 118.352 63.9775C117.298 65.0324 115.867 65.625 114.375 65.625C112.883 65.625 111.452 65.0324 110.398 63.9775C109.343 62.9226 108.75 61.4918 108.75 60C108.75 47.0707 103.614 34.6709 94.4715 25.5285C85.3291 16.3861 72.9293 11.25 60 11.25C58.5082 11.25 57.0774 10.6574 56.0225 9.60248C54.9676 8.54758 54.375 7.11684 54.375 5.625Z"
                  fill="url(#paint0_linear_1390_17926)"
                />
              </g>
              <defs>
                <linearGradient
                  id="paint0_linear_1390_17926"
                  x1="58.35"
                  y1="14.1"
                  x2="118.35"
                  y2="52.575"
                  gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B045E6" stopOpacity="0" />
                  <stop offset="0.735269" stopColor="#B045E6" />
                </linearGradient>
                <clipPath id="clip0_1390_17926">
                  <rect width="121" height="120" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        );
    }
  }

  render() {
    const { widget, isLoading, isPublic, canEdit, isEditing, onRefresh } = this.props;
    const { localParameters } = this.state;
    const widgetQueryResult = widget.getQueryResult();
    const isRefreshing = isLoading && !!(widgetQueryResult && widgetQueryResult.getStatus());
    const onParametersEdit = parameters => {
      const paramOrder = map(parameters, "name");
      widget.options.paramOrder = paramOrder;
      widget.save("options", { paramOrder });
    };

    return (
      <Widget
        {...this.props}
        className="widget-visualization"
        menuOptions={visualizationWidgetMenuOptions({
          widget,
          canEditDashboard: canEdit,
          onParametersEdit: this.editParameterMappings,
        })}
        header={
          widget.visualization.name || widget.visualization.description ? (
            <VisualizationWidgetHeader
              widget={widget}
              refreshStartedAt={isRefreshing ? widget.refreshStartedAt : null}
              parameters={localParameters}
              isEditing={isEditing}
              onParametersUpdate={onRefresh}
              onParametersEdit={onParametersEdit}
            />
          ) : (
            undefined
          )
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
