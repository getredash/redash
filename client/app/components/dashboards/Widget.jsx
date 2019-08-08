import React from 'react';
import PropTypes from 'prop-types';
import { filter, isEmpty } from 'lodash';
import { markdown } from 'markdown';
import { currentUser } from '@/services/auth';
import HtmlContent from '@/components/HtmlContent';
import { Parameters } from '@/components/Parameters';
import { Timer } from '@/components/Timer';
import QueryLink from '@/components/QueryLink';
import { FiltersType } from '@/components/Filters';
import { VisualizationRenderer } from '@/visualizations/VisualizationRenderer';

import './widget.less';

class Widget extends React.Component {
  static propTypes = {
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    filters: FiltersType,
  };

  static defaultProps = {
    filters: [],
  };

  expandWidget = () => {};

  refreshWidget = () => {};

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
    const canViewQuery = currentUser.hasPermission('view_query');
    const widgetQueryResult = widget.getQueryResult();
    const isRefreshing = widget.loading && !!(widgetQueryResult && widgetQueryResult.getStatus());

    const localParameters = filter(
      widget.getParametersDefs(),
      param => !widget.isStaticParam(param),
    );

    return (
      <div className="tile body-container widget-visualization visualization" data-refreshing={isRefreshing}>
        <div className="body-row widget-header">
          <div className="t-header widget clearfix">
            {widget.loading && this.renderRefreshIndicator()}
            <div className="th-title">
              <p>
                <QueryLink query={widget.getQuery()} visualization={widget.visualization} readOnly={!canViewQuery} />
              </p>
              <div className="text-muted query--description">
                <HtmlContent className="body-row-auto scrollbox tiled t-body p-15 markdown">
                  {markdown.toHTML(widget.getQuery().description || '')}
                </HtmlContent>
              </div>
            </div>
          </div>
          {!isEmpty(localParameters) && (
            <div className="m-b-10">
              <Parameters parameters={localParameters} onValuesChange={this.refreshWidget} />
            </div>
          )}
        </div>
        {this.renderWidgetVisualization()}
        <div className="body-row clearfix tile__bottom-control" />
      </div>
    );
  }

  renderTextbox() {
    const { widget } = this.props;
    if (widget.width === 0) {
      return null;
    }

    return (
      <div className="tile body-container widget-text textbox">
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
