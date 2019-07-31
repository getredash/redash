import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { markdown } from 'markdown';
import HtmlContent from '@/components/HtmlContent';
import Button from 'antd/lib/button';
import ExpandWidgetDialog from '@/components/dashboards/ExpandWidgetDialog';

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

    return (
      <div
        className="tile body-container widget-visualization visualization"
      />
    );
  }

  render() {
    const { widget } = this.props;

    return (
      <div className="widget-wrapper">
        {widget.visualization && this.renderVisualization()}
        {widget.restricted ? this.renderRestrictedError() : this.renderTextbox()}
      </div>
    );
  }
}

export default Widget;
