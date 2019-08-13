import React from 'react';
import PropTypes from 'prop-types';
import { filter, isEmpty } from 'lodash';
import { markdown } from 'markdown';
import classNames from 'classnames';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';
import { currentUser } from '@/services/auth';
import recordEvent from '@/services/recordEvent';
import { $location } from '@/services/ng';
import { formatDateTime } from '@/filters/datetime';
import HtmlContent from '@/components/HtmlContent';
import { Parameters } from '@/components/Parameters';
import { Timer } from '@/components/Timer';
import { TimeAgo } from '@/components/TimeAgo';
import QueryLink from '@/components/QueryLink';
import { FiltersType } from '@/components/Filters';
import ExpandWidgetDialog from '@/components/dashboards/ExpandWidgetDialog';
import { VisualizationRenderer } from '@/visualizations/VisualizationRenderer';

import './widget.less';

function WidgetMenu(props) {
  return (
    <Menu {...props}>
      <Menu.Item>Download as CSV File</Menu.Item>
      <Menu.Item>Download as Excel File</Menu.Item>
      <Menu.Divider />
      <Menu.Item>View Query</Menu.Item>
      <Menu.Item>Edit Parameters</Menu.Item>
      <Menu.Divider />
      <Menu.Item>Remove from Dashboard</Menu.Item>
    </Menu>
  );
}

function TextboxMenu(props) {
  return (
    <Menu {...props}>
      <Menu.Item>Edit</Menu.Item>
      <Menu.Item>Remove from Dashboard</Menu.Item>
    </Menu>
  );
}

class Widget extends React.Component {
  static propTypes = {
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    filters: FiltersType,
    isPublic: PropTypes.bool,
    canEdit: PropTypes.bool,
    onDelete: PropTypes.func,
  };

  static defaultProps = {
    filters: [],
    isPublic: false,
    canEdit: false,
    onDelete: () => {},
  };

  state = {
    refreshClickButtonId: null,
  };

  componentDidMount() {
    const { widget } = this.props;
    recordEvent('view', 'widget', widget.id);

    if (widget.visualization) {
      recordEvent('view', 'query', widget.visualization.query.id, { dashboard: true });
      recordEvent('view', 'visualization', widget.visualization.id, { dashboard: true });

      this.loadWidget();
    }
  }

  loadWidget = (refresh = false) => {
    const { widget } = this.props;
    const maxAge = $location.search().maxAge;
    return widget.load(refresh, maxAge);
  };

  expandWidget = () => {
    ExpandWidgetDialog.showModal({ widget: this.props.widget });
  };

  refreshWidget = (refreshClickButtonId) => {
    if (!this.state.refreshClickButtonId) {
      this.setState({ refreshClickButtonId });
      this.loadWidget(true).finally(() => this.setState({ refreshClickButtonId: null }));
    }
  };

  deleteWidget = () => {
    const { widget, onDelete } = this.props;

    const doDelete = () => {
      widget.delete().then(() => onDelete({}));
    };

    Modal.confirm({
      title: 'Delete Widget',
      content: `Are you sure you want to remove "${widget.getName()}" from the dashboard?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: doDelete,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  renderRefreshIndicator() {
    const { widget } = this.props;
    return (
      <div className="refresh-indicator">
        <div className="refresh-icon">
          <i className="zmdi zmdi-refresh zmdi-hc-spin" />
        </div>
        <Timer from={widget.refreshStartedAt} />
      </div>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderRestrictedError() {
    return (
      <div className="tile body-container widget-restricted">
        <div className="t-body body-row-auto scrollbox">
          <div className="text-center">
            <h1><span className="zmdi zmdi-lock" /></h1>
            <p className="text-muted">
              {'This widget requires access to a data source you don\'t have access to.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  renderWidgetHeader() {
    const { widget, isPublic, canEdit } = this.props;
    const canViewQuery = currentUser.hasPermission('view_query');

    const localParameters = filter(
      widget.getParametersDefs(),
      param => !widget.isStaticParam(param),
    );

    return (
      <div className="body-row widget-header">
        <div className="t-header widget clearfix">
          {(!isPublic && canEdit) && (
            <React.Fragment>
              <div className="dropdown pull-right widget-menu-remove">
                <div className="actions">
                  <a title="Remove From Dashboard" onClick={this.deleteWidget}><i className="zmdi zmdi-close" /></a>
                </div>
              </div>
              <div className="dropdown pull-right widget-menu-regular">
                <div className="actions">
                  <Dropdown
                    overlay={<WidgetMenu />}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <a className="p-l-15 p-r-15"><i className="zmdi zmdi-more-vert" /></a>
                  </Dropdown>
                </div>
              </div>
            </React.Fragment>
          )}
          {widget.loading && this.renderRefreshIndicator()}
          <div className="th-title">
            <p>
              <QueryLink query={widget.getQuery()} visualization={widget.visualization} readOnly={!canViewQuery} />
            </p>
            <HtmlContent className="text-muted query--description">
              {markdown.toHTML(widget.getQuery().description || '')}
            </HtmlContent>
          </div>
        </div>
        {!isEmpty(localParameters) && (
          <div className="m-b-10">
            <Parameters parameters={localParameters} onValuesChange={this.refreshWidget} />
          </div>
        )}
      </div>
    );
  }

  renderWidgetBottom() {
    const { widget, isPublic } = this.props;
    const widgetQueryResult = widget.getQueryResult();
    const updatedAt = widgetQueryResult && widgetQueryResult.getUpdatedAt();
    const { refreshClickButtonId } = this.state;
    return (
      <div className="body-row clearfix tile__bottom-control">
        {(!isPublic && !!widgetQueryResult) && (
          <a
            className="refresh-button hidden-print btn btn-sm btn-default btn-transparent"
            onClick={() => this.refreshWidget(1)}
            data-test="RefreshButton"
          >
            <i className={classNames('zmdi zmdi-refresh', { 'zmdi-hc-spin': refreshClickButtonId === 1 })} />{' '}
            <TimeAgo date={updatedAt} />
          </a>
        )}
        <span className="visible-print">
          <i className="zmdi zmdi-time-restore" />{' '}{formatDateTime(updatedAt)}
        </span>
        {isPublic ? (
          <span className="small hidden-print">
            <i className="zmdi zmdi-time-restore" />{' '}<TimeAgo date={updatedAt} />
          </span>
        ) : (
          <a
            className="btn btn-sm btn-default pull-right hidden-print btn-transparent btn__refresh"
            onClick={() => this.refreshWidget(2)}
          >
            <i className={classNames('zmdi zmdi-refresh', { 'zmdi-hc-spin': refreshClickButtonId === 2 })} />
          </a>
        )}
        <a
          className="btn btn-sm btn-default pull-right hidden-print btn-transparent btn__refresh"
          onClick={this.expandWidget}
        >
          <i className="zmdi zmdi-fullscreen" />
        </a>
      </div>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderWidgetVisualization() {
    const { widget, filters } = this.props;
    const widgetQueryResult = widget.getQueryResult();
    const widgetStatus = widgetQueryResult && widgetQueryResult.getStatus();
    switch (widgetStatus) {
      case 'failed':
        return (
          <div className="body-row-auto scrollbox">
            {widgetQueryResult.getError() && (
              <div className="alert alert-danger m-5">
                Error running query: <strong>{widgetQueryResult.getError()}</strong>
              </div>
            )}
          </div>
        );
      case 'done':
        return (
          <div ng-switch-when="done" className="body-row-auto scrollbox">
            <VisualizationRenderer
              visualization={widget.visualization}
              queryResult={widgetQueryResult}
              filters={filters}
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

  renderWidget() {
    const { widget } = this.props;
    const widgetQueryResult = widget.getQueryResult();
    const isRefreshing = widget.loading && !!(widgetQueryResult && widgetQueryResult.getStatus());

    return (
      <div className="tile body-container widget-visualization visualization" data-refreshing={isRefreshing}>
        {this.renderWidgetHeader()}
        {this.renderWidgetVisualization()}
        {this.renderWidgetBottom()}
      </div>
    );
  }

  renderTextbox() {
    const { widget, isPublic, canEdit } = this.props;
    if (widget.width === 0) {
      return null;
    }

    return (
      <div className="tile body-container widget-text textbox">
        <div className="body-row clearfix t-body">
          {(!isPublic && canEdit) && (
            <React.Fragment>
              <div className="dropdown pull-right widget-menu-remove">
                <div className="dropdown-header">
                  <a className="actions" title="Remove From Dashboard" onClick={this.deleteWidget}><i className="zmdi zmdi-close" /></a>
                </div>
              </div>
              <div className="dropdown pull-right widget-menu-regular">
                <div className="dropdown-header">
                  <Dropdown
                    overlay={<TextboxMenu />}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <a className="actions p-l-15 p-r-15"><i className="zmdi zmdi-more-vert" /></a>
                  </Dropdown>
                </div>
              </div>
            </React.Fragment>
          )}
        </div>
        <HtmlContent className="body-row-auto scrollbox tiled t-body p-15 markdown">
          {markdown.toHTML(widget.text)}
        </HtmlContent>
      </div>
    );
  }

  render() {
    const { widget } = this.props;

    return (
      <div className="widget-wrapper">
        {widget.visualization && this.renderWidget()}
        {(!widget.visualization && widget.restricted) && this.renderRestrictedError()}
        {(!widget.visualization && !widget.restricted) && this.renderTextbox()}
      </div>
    );
  }
}

export default Widget;
