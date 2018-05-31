import React from 'react';
import PropTypes from 'prop-types';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js';
import bar from 'plotly.js/lib/bar';
import pie from 'plotly.js/lib/pie';
import histogram from 'plotly.js/lib/histogram';
import box from 'plotly.js/lib/box';
import { each, isArray, isObject } from 'lodash';
import { normalizeValue, updateData, prepareData, prepareLayout } from '@/visualizations/chart/plotly/utils';


Plotly.register([bar, pie, histogram, box]);
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ['sendDataToCloud'],
});

const Plot = createPlotlyComponent(Plotly);


const timeSeriesToPlotlySeries = (ss) => {
  const x = [];
  const ys = {};
  each(ss, (series) => {
    ys[series.name] = [];
    each(series.data, (point) => {
      x.push(normalizeValue(point.x));
      ys[series.name].push(normalizeValue(point.y));
    });
  });
  return [x, ys];
};

export default class PlotlyChart extends React.Component {
  static propTypes = {
    // XXX make this required after porting next layer up
    options: PropTypes.object,
    // eslint-disable-next-line react/no-unused-prop-types
    series: PropTypes.array.isRequired,
    customCode: PropTypes.string,

  }

  static defaultProps = { options: null, customCode: null };

  constructor(props) {
    super(props);
    this.state = {
      data: null,
      layout: null,
      revision: 0,
      x: null,
      ys: null,
    };
    this.refreshCustom = this.refreshCustom.bind(this);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!nextProps.options) return null;
    if (nextProps.options.globalSeriesType === 'custom') {
      const [x, ys] = timeSeriesToPlotlySeries(nextProps.series);
      return { x, ys, revision: prevState.revision + 1 };
    }
    const data = prepareData(nextProps.series, nextProps.options);
    updateData(data, nextProps.options);
    return {
      data,
      layout: prepareLayout(null, nextProps.series, nextProps.options, data),
      revision: prevState.revision + 1,
    };
  }

  refreshCustom = (figure, plotlyElement) => {
    Plotly.newPlot(plotlyElement);
    try {
      // eslint-disable-next-line no-new-func
      const codeCall = new Function('x, ys, element, Plotly', this.props.options.customCode);
      codeCall(this.state.x, this.state.ys, plotlyElement, Plotly);
    } catch (err) {
      if (this.props.options.enableConsoleLogs) {
        // eslint-disable-next-line no-console
        console.log(`Error while executing custom graph: ${err}`);
      }
    }
  }

  restyle = (updates) => {
    if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
      updateData(this.state.data, this.props.options);
      this.setState({ revision: this.state.revision + 1 });
    }
  }

  render() {
    if (!this.props.options) return null;
    return (
      <Plot
        className="plotly-chart-container"
        revision={this.state.revision}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        config={{
          showLink: false,
          displayLogo: false,
          modeBarButtonsToRemove: ['sendDataToCloud'],
        }}
        data={this.state.data}
        layout={this.state.layout}
        onRestyle={this.restyle}
        onUpdate={this.props.options.globalSeriesType === 'custom' ? this.refreshCustom : null}
      />
    );
  }
}
