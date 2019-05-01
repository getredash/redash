import { map } from 'lodash';
import d3 from 'd3';
import { angular2react } from 'angular2react';
import box from '@/lib/visualizations/d3box';
import { registerVisualization } from '@/visualizations';

import Editor from './Editor';

const BoxPlotRenderer = {
  template: '<div resize-event="handleResize()"></div>',
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope, $element) {
    const container = $element[0].querySelector('div');

    function calcIqr(k) {
      return (d) => {
        const q1 = d.quartiles[0];
        const q3 = d.quartiles[2];
        const iqr = (q3 - q1) * k;

        let i = -1;
        let j = d.length;

        // eslint-disable-next-line no-plusplus
        while (d[++i] < q1 - iqr);
        // eslint-disable-next-line no-plusplus
        while (d[--j] > q3 + iqr);
        return [i, j];
      };
    }

    const update = () => {
      const data = this.data.rows;
      const parentWidth = container.offsetWidth;
      const margin = {
        top: 10, right: 50, bottom: 40, left: 50, inner: 25,
      };
      const width = parentWidth - margin.right - margin.left;
      const height = 500 - margin.top - margin.bottom;

      let min = Infinity;
      let max = -Infinity;
      const mydata = [];
      let value = 0;
      let d = [];
      const xAxisLabel = this.options.xAxisLabel;
      const yAxisLabel = this.options.yAxisLabel;

      const columns = map(this.data.columns, col => col.name);
      const xscale = d3.scale.ordinal()
        .domain(columns)
        .rangeBands([0, parentWidth - margin.left - margin.right]);

      let boxWidth;
      if (columns.length > 1) {
        boxWidth = Math.min(xscale(columns[1]), 120.0);
      } else {
        boxWidth = 120.0;
      }
      margin.inner = boxWidth / 3.0;

      columns.forEach((column, i) => {
        d = mydata[i] = [];
        data.forEach((row) => {
          value = row[column];
          d.push(value);
          if (value > max) max = Math.ceil(value);
          if (value < min) min = Math.floor(value);
        });
      });

      const yscale = d3.scale.linear()
        .domain([min * 0.99, max * 1.01])
        .range([height, 0]);

      const chart = box()
        .whiskers(calcIqr(1.5))
        .width(boxWidth - 2 * margin.inner)
        .height(height)
        .domain([min * 0.99, max * 1.01]);
      const xAxis = d3.svg.axis()
        .scale(xscale)
        .orient('bottom');


      const yAxis = d3.svg.axis()
        .scale(yscale)
        .orient('left');

      const xLines = d3.svg.axis()
        .scale(xscale)
        .tickSize(height)
        .orient('bottom');

      const yLines = d3.svg.axis()
        .scale(yscale)
        .tickSize(width)
        .orient('right');

      function barOffset(i) {
        return xscale(columns[i]) + (xscale(columns[1]) - margin.inner) / 2.0;
      }

      d3.select(container).selectAll('*').remove();

      const svg = d3.select(container).append('svg')
        .attr('width', parentWidth)
        .attr('height', height + margin.bottom + margin.top);

      const plot = svg.append('g')
        .attr('width', parentWidth - margin.left - margin.right)
        .attr('transform', `translate(${margin.left},${margin.top})`);

      svg.append('text')
        .attr('class', 'box')
        .attr('x', parentWidth / 2.0)
        .attr('text-anchor', 'middle')
        .attr('y', height + margin.bottom)
        .text(xAxisLabel);

      svg.append('text')
        .attr('class', 'box')
        .attr('transform', `translate(10,${(height + margin.top + margin.bottom) / 2.0})rotate(-90)`)
        .attr('text-anchor', 'middle')
        .text(yAxisLabel);

      plot.append('rect')
        .attr('class', 'grid-background')
        .attr('width', width)
        .attr('height', height);

      plot.append('g')
        .attr('class', 'grid')
        .call(yLines);

      plot.append('g')
        .attr('class', 'grid')
        .call(xLines);

      plot.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);

      plot.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

      plot.selectAll('.box').data(mydata)
        .enter().append('g')
        .attr('class', 'box')
        .attr('width', boxWidth)
        .attr('height', height)
        .attr('transform', (_, i) => `translate(${barOffset(i)},${0})`)
        .call(chart);
    };

    $scope.handleResize = update;

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

export default function init(ngModule) {
  ngModule.component('boxplotRenderer', BoxPlotRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'BOXPLOT',
      name: 'Boxplot (Deprecated)',
      isDeprecated: true,
      getOptions: options => ({ ...options }),
      Renderer: angular2react('boxplotRenderer', BoxPlotRenderer, $injector),
      Editor,

      defaultRows: 8,
      minRows: 5,
    });
  });
}

init.init = true;
