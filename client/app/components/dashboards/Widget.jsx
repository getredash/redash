import React from 'react';
import PropTypes from 'prop-types';
import { filter, isEmpty } from 'lodash';
import { markdown } from 'markdown';
import HtmlContent from '@/components/HtmlContent';
import { Parameters } from '@/components/Parameters';
import { Timer } from '@/components/Timer';
import QueryLink from '@/components/QueryLink';

import './widget.less';

class Widget extends React.Component {
  static propTypes = {
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  state = {
    deleting: false,
  };

  expandWidget = () => {};

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

  renderVisualization() {
    const { widget } = this.props;
    const localParameters = filter(
      widget.getParametersDefs(),
      param => !widget.isStaticParam(param),
    );

    return (
      <div className="tile body-container widget-visualization visualization">
        <div className="body-row widget-header">
          <div className="t-header widget clearfix">
            <div className="refresh-indicator" ng-if="$ctrl.widget.loading">
              <div className="refresh-icon">
                <i className="zmdi zmdi-refresh zmdi-hc-spin" />
              </div>
              <Timer from={widget.refreshStartedAt} />
            </div>
            <div className="th-title">
              <p>
                {/* TODO: add readOnly rule */}
                <QueryLink query={widget.getQuery()} visualization={widget.visualization} />
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
              <Parameters parameters={localParameters} />
            </div>
          )}
        </div>
        <div className="body-row-auto spinner-container">
          <div className="spinner">
            <i className="zmdi zmdi-refresh zmdi-hc-spin zmdi-hc-5x" />
          </div>
        </div>
        <div className="body-row clearfix tile__bottom-control" />
      </div>
    );
  }

  render() {
    const { widget } = this.props;

    return (
      <div className="widget-wrapper">
        {widget.visualization && this.renderVisualization()}
        {(!widget.visualization && widget.restricted) && this.renderRestrictedError()}
        {(!widget.visualization && !widget.restricted) && this.renderTextbox()}
      </div>
    );
  }
}

export default Widget;
