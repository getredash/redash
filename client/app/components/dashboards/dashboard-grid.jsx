import React from 'react';
import PropTypes from 'prop-types';
import { chain, pick } from 'lodash';
import { react2angular } from 'react2angular';
import cx from 'classnames';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { DashboardWidget } from '@/components/dashboards/widget';
import cfg from '@/config/dashboard-grid-options';

import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WidgetType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  options: PropTypes.shape({
    position: PropTypes.shape({
      col: PropTypes.number.isRequired,
      row: PropTypes.number.isRequired,
      sizeY: PropTypes.number.isRequired,
      minSizeY: PropTypes.number.isRequired,
      maxSizeY: PropTypes.number.isRequired,
      sizeX: PropTypes.number.isRequired,
      minSizeX: PropTypes.number.isRequired,
      maxSizeX: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
});

const SINGLE = 'single-column';
const MULTI = 'multi-column';

class DashboardGrid extends React.Component {
  static propTypes = {
    isEditing: PropTypes.bool.isRequired,
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    widgets: PropTypes.arrayOf(WidgetType).isRequired,
    onBreakpointChange: PropTypes.func,
    onRemoveWidget: PropTypes.func,
    onLayoutChange: PropTypes.func,
  };

  static defaultProps = {
    onRemoveWidget: () => {},
    onLayoutChange: () => {},
    onBreakpointChange: () => {},
  }

  static normalizeFrom(widget) {
    const { id, options: { position: pos } } = widget;

    return {
      i: id.toString(),
      x: pos.col,
      y: pos.row,
      w: pos.sizeX,
      h: pos.sizeY,
      minW: pos.minSizeX,
      maxW: pos.maxSizeX,
      minH: pos.minSizeY,
      maxH: pos.maxSizeY,
      toString: () => JSON.stringify(pick(pos, ['col', 'row', 'sizeX', 'sizeY'])),
    };
  }

  static normalizeTo(layout) {
    return {
      col: layout.x,
      row: layout.y,
      sizeX: layout.w,
      sizeY: layout.h,
    };
  }

  state = {
    layouts: {},
  }

  mode = document.body.offsetWidth <= cfg.mobileBreakPoint ? SINGLE : MULTI

  onLayoutChange = (layout, layouts) => {
    this.setState({ layouts });

    // workaround till fix lands for https://github.com/STRML/react-grid-layout/issues/889
    this.mode = document.body.offsetWidth <= cfg.mobileBreakPoint ? SINGLE : MULTI;
    // end workaround

    // don't save single column mode layout
    if (this.mode === SINGLE) {
      return;
    }

    const normalized = chain(layout)
      .keyBy('i')
      .mapValues(DashboardGrid.normalizeTo)
      .value();

    this.props.onLayoutChange(normalized);
  }

  onBreakpointChange = (mode) => {
    this.mode = mode;
    this.props.onBreakpointChange(mode === SINGLE);
  }

  render() {
    const className = cx('dashboard-wrapper', this.props.isEditing ? 'editing-mode' : 'preview-mode');
    const { onRemoveWidget, dashboard, widgets } = this.props;

    return (
      <div className={className}>
        <ResponsiveGridLayout
          className="layout"
          cols={{ [MULTI]: cfg.columns, [SINGLE]: 1 }}
          rowHeight={cfg.rowHeight - cfg.margins}
          margin={[cfg.margins, cfg.margins]}
          isDraggable={this.props.isEditing}
          isResizable={this.props.isEditing}
          layouts={this.state.layouts}
          onLayoutChange={this.onLayoutChange}
          onBreakpointChange={this.onBreakpointChange}
          breakpoints={{ [MULTI]: cfg.mobileBreakPoint, [SINGLE]: 0 }}
          measureBeforeMount
        >
          {widgets.map(widget => (
            <div
              key={widget.id}
              data-grid={DashboardGrid.normalizeFrom(widget)}
              data-test={`WidgetId${widget.id}`}
              className="dashboard-widget-wrapper"
            >
              <DashboardWidget
                widget={widget}
                dashboard={dashboard}
                deleted={() => onRemoveWidget(widget.id)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('dashboardGrid', react2angular(DashboardGrid));
}

init.init = true;
