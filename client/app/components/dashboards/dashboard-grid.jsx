import React from 'react';
import PropTypes from 'prop-types';
import { chain, pick } from 'lodash';
import { react2angular } from 'react2angular';
import cx from 'classnames';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import { DashboardWidget } from '@/components/dashboards/widget';
import { FiltersType } from '@/components/Filters';
import cfg from '@/config/dashboard-grid-options';

import 'react-grid-layout/css/styles.css';
import './dashboard-grid.less';

const ResponsiveGridLayout = WidthProvider(GridLayout);

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

class DashboardGrid extends React.Component {
  static propTypes = {
    isEditing: PropTypes.bool.isRequired,
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    widgets: PropTypes.arrayOf(WidgetType).isRequired,
    filters: FiltersType,
    onRemoveWidget: PropTypes.func,
    onLayoutChange: PropTypes.func,
  };

  static defaultProps = {
    onRemoveWidget: () => {},
    onLayoutChange: () => {},
    filters: [],
  };

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
    disableAnimations: true,
  };

  componentDidMount() {
    // Work-around to disable initial animation on widgets; `measureBeforeMount` doesn't work properly:
    // it disables animation, but it cannot detect scrollbars.
    setTimeout(() => {
      this.setState({ disableAnimations: false });
    }, 50);
  }

  onLayoutChange(layout) {
    const normalized = chain(layout)
      .keyBy('i')
      .mapValues(DashboardGrid.normalizeTo)
      .value();

    this.props.onLayoutChange(normalized);
  }

  render() {
    const className = cx('dashboard-wrapper', this.props.isEditing ? 'editing-mode' : 'preview-mode');
    const { onRemoveWidget, dashboard, widgets } = this.props;

    return (
      <div className={className}>
        <ResponsiveGridLayout
          className={cx('layout', { 'disable-animations': this.state.disableAnimations })}
          cols={cfg.columns}
          rowHeight={cfg.rowHeight - cfg.margins}
          margin={[cfg.margins, cfg.margins]}
          isDraggable={this.props.isEditing}
          isResizable={this.props.isEditing}
          onLayoutChange={layout => this.onLayoutChange(layout)}
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
                filters={this.props.filters}
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
