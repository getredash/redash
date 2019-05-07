import { each, debounce, min, max, merge, reduce, cloneDeep } from 'lodash';
import d3 from 'd3';
import angular from 'angular';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import chroma from 'chroma-js';
import ColorPalette from '@/visualizations/ColorPalette';
import { formatSimpleTemplate } from '@/lib/value-format';
import editorTemplate from './treemap-editor.html';

import './treemap.less';

const DEFAULT_OPTIONS = {
  cellPadding: 1,
  tooltip: {
    enabled: true,
    template: '<b>{{ @@child }} :</b> {{ @@size }}',
  },
  datalabel: {
    enabled: true,
    template: '{{ @@child }}',
  },
  customColor: {
    enabled: false,
    encoding: 'value',
    min: '#356AFF',
    max: '#50F5ED',
  },
};

function createTreemap(element, data, scope, $sanitize) {
  const options = scope.$ctrl.options;
  const margin = {
    top: 20, right: 50, bottom: 20, left: 50,
  };
  const width = element.clientWidth - margin.right - margin.left;
  const height = 460 - margin.top - margin.bottom;
  const defaultColor = d3.scale.category20c();

  if ((width <= 0) || (height <= 0)) {
    return;
  }

  const svg = d3.select(element).append('svg')
    .attr('width', width + margin.right + margin.left)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(-.5,-.5)');

  const tooltip = d3.select(element).append('div').attr('class', 'treemap-tooltip');

  function datalabelText(item) {
    return $sanitize(formatSimpleTemplate(options.datalabel.template, item));
  }

  function getTreeAttr(array, attr) {
    return array.reduce((r, a) => {
      r.push(a[attr]);
      if (a.children && Array.isArray(a.children)) {
        r = r.concat(getTreeAttr(a.children, attr));
      }
      return r;
    }, []);
  }

  const zMin = min(getTreeAttr(data, options.colorColumn));
  const zMax = max(getTreeAttr(data, options.colorColumn));

  const chromaColor = chroma.scale([
    options.customColor.min,
    options.customColor.max,
  ]).domain([zMin, zMax]);

  function getColor(item) {
    if (options.customColor.enabled) {
      if (options.customColor.encoding === 'category') {
        return defaultColor(item[options.colorColumn]);
      }
      return chromaColor(item[options.colorColumn]);
    }
    let name = '';
    if (!item.parent) {
      name = '';
    } else {
      name = item.children ? item[options.childColumn] : item.parent[options.childColumn];
    }
    return defaultColor(name);
  }

  function ascSorter(a, b) {
    return a.value - b.value;
  }

  function descSorter(a, b) {
    return b.value - a.value;
  }

  const treemap = d3.layout.treemap()
    .size([width, height])
    .padding(options.cellPadding)
    .sort((a, b) => (options.sortReverse ? descSorter(a, b) : ascSorter(a, b)))
    .value(d => d[options.sizeColumn]);

  const cell = svg.data(data).selectAll('g')
    .data(treemap.nodes)
    .enter()
    .append('g')
    .attr('class', 'cell')
    .attr('transform', () => 'translate(' + margin.left + ',' + margin.top + ')');

  const rects = cell.append('rect')
    .attr('id', d => 'rect-' + d['@@rownum'])
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.dx)
    .attr('height', d => d.dy)
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .attr('fill', d => getColor(d));

  if (options.tooltip.enabled) {
    rects
      .on('mousemove', (d) => {
        tooltip.html($sanitize(formatSimpleTemplate(options.tooltip.template, d)));
        tooltip.style('display', 'block');

        const tooltipWidth = Number(tooltip.style('width').slice(0, -2));
        const tooltipHeight = Number(tooltip.style('height').slice(0, -2));
        const posTop = margin.top + d.y + d.dy / 2 - tooltipHeight / 2;
        const posLeft = margin.left + d.x + d.dx / 2;

        tooltip.style('top', posTop + 'px');

        const rightEnd = posLeft + tooltipWidth;
        if (rightEnd > element.clientWidth) {
          tooltip.style('left', element.clientWidth - tooltipWidth + 'px');
        } else {
          tooltip.style('left', posLeft + 'px');
        }
      })
      .on('mouseout', () => {
        tooltip.style('display', 'none');
      });
  }

  if (options.datalabel.enabled) {
    cell.append('text')
      .attr('class', 'treemap-text')
      .attr('clip-path', (d) => {
        const clipWidth = d.dx - 4;
        const clipHeight = d.dy;
        return 'polygon(0px ' + clipHeight + 'px, '
          + clipWidth + 'px ' + clipHeight + 'px, '
          + clipWidth + 'px 0px, 0px 0px )';
      })
      .attr('x', d => d.x + 3)
      .attr('y', d => d.y + 12)
      .html(d => (d.children ? null : datalabelText(d)));
  }
}

const TreemapRenderer = {
  restrict: 'E',
  template: '<div class="treemap-visualization-container" resize-event="handleResize()"></div>',
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope, $element, $sanitize) {
    const update = () => {
      const queryData = cloneDeep(this.data.rows);
      const options = $scope.$ctrl.options;

      if (!queryData) { return; }

      // eslint-disable-next-line prefer-arrow-callback
      const dataMap = reduce(queryData, function makeDatamap(map, node) {
        map[node[options.childColumn]] = node;
        return map;
      }, {});

      each(queryData, (item, index) => {
        item['@@child'] = item[options.childColumn];
        item['@@parent'] = item[options.parentColumn];
        item['@@size'] = item[options.sizeColumn];
        item['@@rownum'] = index;
      });

      const treeData = [];
      // eslint-disable-next-line prefer-arrow-callback
      queryData.forEach(function makeTree(node) {
        // add to parent
        const parent = dataMap[node[options.parentColumn]];
        if (parent) {
          // create child array if it doesn't exist
          (parent.children || (parent.children = []))
            // add node to child array
            .push(node);
        } else {
          // parent is null or missing
          treeData.push(node);
        }
      });
      if (treeData) {
        const container = $element[0].querySelector('.treemap-visualization-container');
        angular.element(container).empty();
        createTreemap(container, treeData, $scope, $sanitize);
      }
    };

    $scope.handleResize = debounce(update, 50);

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

const TreemapEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    $scope.colors = ColorPalette;
    $scope.currentTab = 'general';

    $scope.colorEncodings = {
      value: 'value',
      category: 'category',
    };

    $scope.templateHint = `
        <div class="p-b-5">All query result columns can be referenced using <code>{{ column_name }}</code> syntax.</div>
        <div class="p-b-5">Use special names to access additional properties:</div>
        <div><code>{{ @@parent }}</code> parent node;</div>
        <div><code>{{ @@child }}</code> child node;</div>
        <div><code>{{ @@size }}</code> size;</div>
        <div class="p-t-5">This syntax is applicable to tooltip and popup templates.</div>
    `;
  },
};

export default function init(ngModule) {
  ngModule.component('treemapRenderer', TreemapRenderer);
  ngModule.component('treemapEditor', TreemapEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'TREEMAP',
      name: 'Treemap',
      getOptions: options => merge({}, DEFAULT_OPTIONS, options),
      Renderer: angular2react('treemapRenderer', TreemapRenderer, $injector),
      Editor: angular2react('treemapEditor', TreemapEditor, $injector),

      defaultRows: 10,
    });
  });
}

init.init = true;
