import React from 'react';
import PropTypes from 'prop-types';
import { compact, each, extend, findKey, includes, fromPairs, get, map, sortBy, values } from 'lodash';

import { ClientConfig, QueryData } from '@/components/proptypes';
import PlotlyChart from './PlotlyChart';

function getSeriesNames(mapping, columns) {
  return compact(map(columns, name => includes(['y', 'series', 'multiFilter', 'multi-filter'], mapping[name]) && name));
}

function addPointToSeries(point, seriesCollection, seriesName) {
  if (seriesCollection[seriesName] === undefined) {
    seriesCollection[seriesName] = {
      name: seriesName,
      type: 'column',
      data: [],
    };
  }

  seriesCollection[seriesName].data.push(point);
}

function chartData(mapping, data) {
  const series = {};

  data.rows.forEach((row) => {
    let point = { $raw: row };
    let seriesName;
    let xValue = 0;
    const yValues = {};
    let eValue = null;
    let sizeValue = null;
    let zValue = null;

    each(row, (v, definition) => {
      definition = '' + definition;
      const definitionParts = definition.split('::') || definition.split('__');
      const name = definitionParts[0];
      const type = mapping ? mapping[definition] : definitionParts[1];
      let value = v;

      if (type === 'unused') {
        return;
      }

      if (type === 'x') {
        xValue = value;
        point[type] = value;
      }
      if (type === 'y') {
        if (value == null) {
          value = 0;
        }
        yValues[name] = value;
        point[type] = value;
      }
      if (type === 'yError') {
        eValue = value;
        point[type] = value;
      }

      if (type === 'series') {
        seriesName = String(value);
      }

      if (type === 'size') {
        point[type] = value;
        sizeValue = value;
      }

      if (type === 'zVal') {
        point[type] = value;
        zValue = value;
      }

      if (type === 'multiFilter' || type === 'multi-filter') {
        seriesName = String(value);
      }
    });

    if (seriesName === undefined) {
      each(yValues, (yValue, ySeriesName) => {
        point = { x: xValue, y: yValue, $raw: point.$raw };
        if (eValue !== null) {
          point.yError = eValue;
        }

        if (sizeValue !== null) {
          point.size = sizeValue;
        }
        if (zValue !== null) {
          point.zVal = zValue;
        }
        addPointToSeries(point, series, ySeriesName);
      });
    } else {
      addPointToSeries(point, series, seriesName);
    }
  });
  return sortBy(values(series), 'name');
}


export default class ChartRenderer extends React.Component {
  static Options = PlotlyChart.Options

  static DEFAULT_OPTIONS = Object.freeze({
    globalSeriesType: 'column',
    sortX: true,
    legend: { enabled: true },
    yAxis: [{ type: 'linear' }, { type: 'linear' }],
    xAxis: { type: '-', labels: { enabled: true } },
    series: { stacking: null },
    seriesOptions: {},
    valuesOptions: {},
    columnMapping: {},
    numberFormat: '0,0[.]00000',
    percentFormat: '0[.]00%',
    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 1,
    minRows: 5,
    textFormat: '',
  });

  static propTypes = {
    data: QueryData.isRequired,
    options: PlotlyChart.Options.isRequired,
    // eslint-disable-next-line react/no-unused-prop-types
    updateOptions: PropTypes.func.isRequired,
    clientConfig: ClientConfig.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      data: props.data,
    };
  }

  static getDerivedStateFromProps(newProps, oldState) {
    if (newProps.data !== oldState.data) {
      // data changed, update options to match
      const opts = newProps.visualization.options;
      const seriesNames = getSeriesNames(opts.columnMapping, newProps.data.columns);
      // build new seriesOptions to cover new columns in data
      const seriesOptions = fromPairs(map(seriesNames, n => [n, opts.seriesOptions[n] ||
                                                             { type: opts.globalSeriesType, yAxis: 0 }]));
      let valuesOptions = opts.valuesOptions;
      if (opts.globalSeriesType === 'pie') {
        const xColumn = findKey(opts.columnMapping, v => v === 'x');
        const uniqueValuesNames = new Set(map(newProps.data.rows, xColumn));
        valuesOptions = fromPairs(map(uniqueValuesNames, n => opts.valuesOptions[n] || {}));
      }
      newProps.updateOptions({ ...opts, seriesOptions, valuesOptions });
      return {
        queryResult: newProps.queryResult,
      };
    }
    return null;
  }

  static getSeriesNames = getSeriesNames

  render() {
    const data = chartData(this.props.options.columnMapping, this.props.data);
    const chartSeries = sortBy(data, (o, s) => get(o.seriesOptions, [s && s.name, 'zIndex'], 0));

    return (
      <PlotlyChart
        options={extend({
          showDataLabels: this.props.options.globalSeriesType === 'pie',
          dateTimeFormat: this.props.clientConfig.dateTimeFormat,
          }, ChartRenderer.DEFAULT_OPTIONS, this.props.options)}
        series={chartSeries}
        customCode={this.props.options.customCode}
      />
    );
  }
}
