import { debounce, sortBy } from 'underscore';
import d3 from 'd3';
import angular from 'angular';

import editorTemplate from './funnel-editor.html';
import './funnel.less';

function Funnel(scope, element) {
  this.element = element;
  this.watches = [];
  const vis = d3.select(element);

  function normalizePercentage(num) {
    return num < 0.01 ? '<0.01%' : num.toFixed(2) + '%';
  }

  function drawFunnel(data) {
    // Table
    const table = vis.append('table')
      .attr('class', 'table table-condensed table-hover table-borderless');

    // Header
    const header = table.append('thead').append('tr');
    header.append('th').text('Step');
    header.append('th');
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
      .attr('class', 'col-md-5')
      .append('div')
      .attr('class', 'container')
      .style('min-width', '200px');
    valContainers.append('div')
      .attr('class', 'bar centered')
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
      .style('width', d => d.pctPrevious.toFixed(2) + '%');
    pctContainers.append('div')
      .attr('class', 'value')
      .text(d => normalizePercentage(d.pctPrevious));
  }

  // visualize funnel data
  function createVisualization(data) {
    drawFunnel(data); // draw funnel
  }

  function removeVisualization() {
    vis.selectAll('table').remove();
  }

  function prepareData(queryData, stepCol, valCol) {
    // Column validity
    const sortedData = sortBy(queryData, valCol).reverse();
    return sortedData.map((row, i) => ({
      step: row[stepCol],
      value: row[valCol],
      pctTotal: row[valCol] / sortedData[0][valCol] * 100.0,
      pctPrevious: i === 0 ? 100.0 : row[valCol] / sortedData[i - 1][valCol] * 100.0,
    }), []);
  }

  function render(queryData) {
    const data = prepareData(queryData, 'steps', 'values'); // build funnel data
    removeVisualization(); // remove existing visualization if any
    createVisualization(data); // visualize funnel data
  }

  function refreshData() {
    const queryData = scope.queryResult.getData();
    if (queryData) {
      render(queryData);
    }
  }

  refreshData();
  this.watches.push(scope.$watch('visualization.options', refreshData, true));
  this.watches.push(scope.$watch('queryResult && queryResult.getData()', refreshData));
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

      scope.$watch('visualization.options.height', (oldValue, newValue) => {
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
      defaultrs: 7,
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
