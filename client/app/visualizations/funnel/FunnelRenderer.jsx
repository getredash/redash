import React from 'react';
import PropTypes from 'prop-types';
import { sortBy, isNumber, every, difference, map } from 'lodash';
import d3 from 'd3';

import { QueryData } from '@/components/proptypes';
import { ColorPalette, normalizeValue } from '@/visualizations/chart/plotly/utils';
import './funnel.less';

function isNoneNaNNum(val) {
  if (!isNumber(val) || isNaN(val)) {
    return false;
  }
  return true;
}

function normalizePercentage(num) {
  if (num < 0.01) { return '<0.01%'; }
  if (num > 1000) { return '>1000%'; }
  return num.toFixed(2) + '%';
}

const FunnelOptions = PropTypes.exact({
  stepCol: PropTypes.exact({
    colName: PropTypes.string.isRequired,
    displayAs: PropTypes.string.isRequired,
  }),
  valueCol: PropTypes.exact({
    colName: PropTypes.string.isRequired,
    displayAs: PropTypes.string.isRequired,
  }),
  sortKeyCol: PropTypes.exact({
    colName: PropTypes.string.isRequired,
  }),
  autoSort: PropTypes.bool.isRequired,
});

export default class FunnelRenderer extends React.Component {
  static Options = FunnelOptions

  static DEFAULT_OPTIONS = Object.freeze({
    stepCol: Object.freeze({ colName: '', displayAs: 'Steps' }),
    valueCol: Object.freeze({ colName: '', displayAs: 'Value' }),
    sortKeyCol: Object.freeze({ colName: '' }),
    autoSort: true,
    defaultRows: 10,
  })

  static propTypes = {
    data: QueryData.isRequired,
    options: FunnelOptions.isRequired,
  }

  componentDidMount() {
    this.drawFunnel();
  }

  componentDidUpdate() {
    this.drawFunnel();
  }

  containerRef = React.createRef();

  invalidColNames = () => {
    const colToCheck = [this.props.options.stepCol.colName, this.props.options.valueCol.colName];
    if (!this.props.options.autoSort) {
      colToCheck.push(this.props.options.sortKeyCol.colName);
    }
    return difference(colToCheck, map(this.props.data.columns, 'name')).length > 0;
  }

  prepareData = () => {
    const data = this.props.data.rows.map(row => ({
      step: normalizeValue(row[this.props.options.stepCol.colName]),
      value: Number(row[this.props.options.valueCol.colName]),
      sortVal: this.props.options.autoSort ? '' : row[this.props.options.sortKeyCol.colName],
    }), []);
    let sortedData;
    if (this.props.options.autoSort) {
      sortedData = sortBy(data, 'value').reverse();
    } else {
      sortedData = sortBy(data, 'sortVal');
    }

    // Column validity
    if (sortedData[0].value === 0 || !every(sortedData, d => isNoneNaNNum(d.value))) {
      return;
    }
    const maxVal = d3.max(data, d => d.value);
    sortedData.forEach((d, i) => {
      d.pctMax = d.value / maxVal * 100.0;
      d.pctPrevious = i === 0 ? 100.0 : d.value / sortedData[i - 1].value * 100.0;
    });
    return sortedData.slice(0, 100);
  }


  drawFunnel = () => {
    const node = this.containerRef.current;
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }

    if (this.props.data === null) return;
    if (this.invalidColNames()) return;
    const data = this.prepareData();
    if (!data) return;
    const vis = d3.select(node);
    const maxToPrevious = d3.max(data, d => d.pctPrevious);
    // Table
    const table = vis.append('table')
      .attr('class', 'table table-condensed table-hover table-borderless');

    // Header
    const header = table.append('thead').append('tr');
    header.append('th').text(this.props.options.stepCol.displayAs);
    header.append('th').attr('class', 'text-center').text(this.props.options.valueCol.displayAs);
    header.append('th').attr('class', 'text-center').text('% Max');
    header.append('th').attr('class', 'text-center').text('% Previous');

    // Body
    const trs = table.append('tbody')
      .selectAll('tr')
      .data(data)
      .enter()
      .append('tr');

    // Steps row
    trs.append('td')
      .attr('class', 'col-xs-3 step')
      .text(d => d.step)
      .append('div')
      .attr('class', 'step-name')
      .text(d => d.step);

    // Funnel bars
    const valContainers = trs.append('td')
      .attr('class', 'col-xs-5')
      .append('div')
      .attr('class', 'container');
    valContainers.append('div')
      .attr('class', 'bar centered')
      .style('background-color', ColorPalette.Cyan)
      .style('width', d => d.pctMax + '%');
    valContainers.append('div')
      .attr('class', 'value')
      .text(d => d.value.toLocaleString());

    // pctMax
    trs.append('td')
      .attr('class', 'col-xs-2 text-center')
      .text(d => normalizePercentage(d.pctMax));

    // pctPrevious
    const pctContainers = trs.append('td')
      .attr('class', 'col-xs-2')
      .append('div')
      .attr('class', 'container');
    pctContainers.append('div')
      .attr('class', 'bar')
      .style('background-color', ColorPalette.Gray)
      .style('opacity', '0.2')
      .style('width', d => (d.pctPrevious / maxToPrevious * 100.0) + '%');
    pctContainers.append('div')
      .attr('class', 'value')
      .text(d => normalizePercentage(d.pctPrevious));
  }

  render() {
    return <div className="funnel-visualization-container" ref={this.containerRef} />;
  }
}
