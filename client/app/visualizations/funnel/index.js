import { debounce, sortBy, isNumber, every, difference } from 'underscore';
import d3 from 'd3';
import angular from 'angular';

import { ColorPalette, normalizeValue } from '@/visualizations/chart/plotly/utils';
import editorTemplate from './funnel-editor.html';
import './funnel.less';

function isNoneNaNNum(val) {
  if (!isNumber(val) || isNaN(val)) {
    return false;
  }
  return true;
}

function normalizePercentage(num) {
  return num < 0.01 ? '<0.01%' : num.toFixed(2) + '%';
}

function Funnel(scope, element) {
  this.element = element;
  this.watches = [];
  const vis = d3.select(element);
  const options = scope.visualization.options;

  function drawFunnel(data) {
    // Table
    const table = vis.append('table')
      .attr('class', 'table table-condensed table-hover table-borderless');

    // Header
    const header = table.append('thead').append('tr');
    header.append('th').text(options.stepCol.dispAs);
    header.append('th').attr('class', 'text-center').text(options.valueCol.dispAs);
    header.append('th').attr('class', 'text-center').text('% Total');
    header.append('th').attr('class', 'text-center').text('% Previous');

    // Body
    const trs = table.append('tbody')
      .selectAll('tr')
      .data(data)
      .enter()
      .append('tr');

    // Steps row
    trs.append('td')
      .attr('class', 'col-md-3')
      .text(d => d.step);

    // Funnel bars
    const valContainers = trs.append('td')
      .append('div')
      .attr('class', 'container')
      .style('min-width', '200px');
    valContainers.append('div')
      .attr('class', 'bar centered')
      .style('background-color', ColorPalette.Cyan)
      .style('width', d => d.pctTotal + '%');
    valContainers.append('div')
      .attr('class', 'value')
      .text(d => d.value.toLocaleString());

    // pctTotal
    trs.append('td')
      .attr('class', 'col-md-2 text-center')
      .text(d => normalizePercentage(d.pctTotal));

    // pctPrevious
    const pctContainers = trs.append('td')
      .attr('class', 'col-md-2')
      .append('div')
      .attr('class', 'container');
    pctContainers.append('div')
      .attr('class', 'bar')
      .style('background-color', ColorPalette.Gray)
      .style('opacity', '0.2')
      .style('width', d => d.pctPrevious.toFixed(2) + '%');
    pctContainers.append('div')
      .attr('class', 'value')
      .text(d => normalizePercentage(d.pctPrevious));
  }

  function createVisualization(data) {
    drawFunnel(data); // draw funnel
  }

  function removeVisualization() {
    vis.selectAll('table').remove();
  }

  function prepareData(queryData, stepCol, valCol) {
    const data = queryData.map(row => ({
      step: normalizeValue(row[stepCol]),
      value: Number(row[valCol]),
    }), []);
    const sortedData = sortBy(data, 'value').reverse();

    // Column validity
    if (sortedData[0].value === 0 || !every(sortedData, d => isNoneNaNNum(d.value))) {
      return;
    }
    sortedData.forEach((d, i) => {
      d.pctTotal = d.value / sortedData[0].value * 100.0;
      d.pctPrevious = i === 0 ? 100.0 : d.value / sortedData[i - 1].value * 100.0;
    });
    return sortedData;
  }

  function invalidColNames() {
    const colNames = scope.queryResult.getColumnNames();
    const colToCheck = [options.stepCol.colName, options.valueCol.colName];
    if (difference(colToCheck, colNames).length > 0) {
      return true;
    }
    return false;
  }

  function refresh() {
    removeVisualization();
    if (invalidColNames()) { return; }

    const queryData = scope.queryResult.getData();
    const data = prepareData(queryData, options.stepCol.colName, options.valueCol.colName);
    if (data) {
      createVisualization(data); // draw funnel
    }
  }

  refresh();
  this.watches.push(scope.$watch('visualization.options', refresh, true));
  this.watches.push(scope.$watch('queryResult && queryResult.getData()', refresh));
}

Funnel.prototype.remove = function remove() {
  this.watches.forEach((unregister) => {
    unregister();
  });
  angular.element(this.element).empty('.vis-container');
};

function funnelRenderer() {
  return {
    restrict: 'E',
    template: '<div class="funnel-visualization-container resize-event="handleResize()"></div>',
    link(scope, element) {
      const container = element[0].querySelector('.funnel-visualization-container');
      let funnel = new Funnel(scope, container);

      function resize() {
        funnel.remove();
        funnel = new Funnel(scope, container);
      }

      scope.handleResize = debounce(resize, 50);

      scope.$watch('visualization.options', (oldValue, newValue) => {
        if (oldValue !== newValue) {
          resize();
        }
      });
    },
  };
}

function funnelEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
  };
}

export default function init(ngModule) {
  ngModule.directive('funnelRenderer', funnelRenderer);
  ngModule.directive('funnelEditor', funnelEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
      '<funnel-renderer options="visualization.options" query-result="queryResult"></funnel-renderer>';

    const editTemplate = '<funnel-editor></funnel-editor>';
    const defaultOptions = {
      stepCol: { colName: '', dispAs: 'Steps' },
      valueCol: { colName: '', dispAs: 'Value' },
      defaultRows: 10,
    };

    VisualizationProvider.registerVisualization({
      type: 'FUNNEL',
      name: 'Funnel',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
