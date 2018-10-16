import React from 'react';
import PropTypes from 'prop-types';
import { compact, each, extend, findKey, includes, fromPairs, get, map, sortBy, values } from 'lodash';

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
        addPointToSeries(point, series, ySeriesName);
      });
    } else {
      addPointToSeries(point, series, seriesName);
    }
  });
  return sortBy(values(series), 'name');
}

export default class ChartRenderer extends React.Component {
  static getSeriesNames = getSeriesNames

  static DEFAULT_OPTIONS = Object.freeze({
    globalSeriesType: 'column',
    sortX: true,
    legend: { enabled: true },
    yAxis: [{ type: 'linear' }, { type: 'linear', opposite: true }],
    xAxis: { type: '-', labels: { enabled: true } },
    error_y: { type: 'data', visible: true },
    series: { stacking: null, error_y: { type: 'data', visible: true } },
    seriesOptions: {},
    valuesOptions: {},
    columnMapping: {},

    // showDataLabels: false, // depends on chart type
    numberFormat: '0,0[.]00000',
    percentFormat: '0[.]00%',
    // dateTimeFormat: 'DD/MM/YYYY HH:mm', // will be set from clientConfig
    textFormat: '', // default: combination of {{ @@yPercent }} ({{ @@y }} ± {{ @@yError }})

    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 1,
    minRows: 5,
  });

  static propTypes = {
    // eslint-disable-next-line react/no-unused-prop-types
    data: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    // eslint-disable-next-line react/no-unused-prop-types
    updateOptions: PropTypes.func.isRequired,
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

  constructor(props) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      data: props.data,
    };
  }

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
