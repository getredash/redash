import d3 from 'd3';
import angular from 'angular';
import chroma from 'chroma-js';
import { each, debounce, min, max } from 'lodash';
import { ColorPalette } from '@/visualizations/chart/plotly/utils';
import { formatSimpleTemplate } from '@/lib/value-format';
import editorTemplate from './treemap-editor.html';

import './treemap.less';

function createTreemap(element, data, scope, $sanitize) {
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

  const tooltip = d3.select('visualization-renderer').append('div').attr('class', 'treemap-tooltip');

  const rootTree = data;

  function datalabelText(item) {
    return $sanitize(formatSimpleTemplate(scope.options.datalabel.template, item));
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

  function update(source) {
    const zMin = min(getTreeAttr(source, scope.options.colorColumn));
    const zMax = max(getTreeAttr(source, scope.options.colorColumn));

    const chromaColor = chroma.scale([
      scope.options.customColor.min,
      scope.options.customColor.max,
    ]).domain([zMin, zMax]);

    function getColor(item) {
      if (scope.options.customColor.enabled) {
        if (scope.options.customColor.encoding === 'category') {
          return defaultColor(item[scope.options.colorColumn]);
        }
        return chromaColor(item[scope.options.colorColumn]);
      }
      let name = '';
      if (!item.parent) {
        name = '';
      } else {
        name = item.children ? item.name : item.parent.name;
      }
      return defaultColor(name);
    }

    function ascSorter(a, b) {
      return a.value - b.value;
    }

    function descSorter(a, b) {
      return b.value - a.value;
    }

    d3.select('svg')
      .attr('height', height + margin.top + margin.bottom)
      .attr('width', width + margin.left + margin.right);

    const treemap = d3.layout.treemap()
      .size([width, height])
      .padding(scope.options.cellPadding)
      .sort((a, b) => (scope.options.sortReverse ? descSorter(a, b) : ascSorter(a, b)))
      .value(d => d[scope.options.sizeColumn]);

    const cell = svg.data(source).selectAll('g')
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

    if (scope.options.tooltip.enabled) {
      rects
        .on('mousemove', (d) => {
          tooltip.html($sanitize(formatSimpleTemplate(scope.options.tooltip.template, d)));
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

    if (scope.options.datalabel.enabled) {
      cell.append('clipPath')
        .attr('id', d => 'clip-' + d['@@rownum'])
        .append('use')
        .attr('transform', 'translate(-2,0)')
        .attr('xlink:href', d => '#rect-' + d['@@rownum'] + '');

      cell.append('text')
        .attr('class', 'treemap-text')
        .attr('clip-path', d => 'url(#clip-' + d['@@rownum'] + ')')
        .attr('x', d => d.x + 3)
        .attr('y', d => d.y + 10)
        .html(d => (d.children ? null : datalabelText(d)));
    }
  }
  update(rootTree);
}

function treemapRenderer($sanitize) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=',
    },
    template: '<div class="treemap-visualization-container" resize-event="handleResize()"></div>',
    replace: false,
    link($scope, element) {
      function refreshData() {
        const queryData = angular.copy($scope.queryResult.getData());

        if (!queryData) { return; }

        // eslint-disable-next-line prefer-arrow-callback
        const dataMap = queryData.reduce(function makeDatamap(map, node) {
          map[node[$scope.options.childColumn]] = node;
          return map;
        }, {});

        each(queryData, (item, index) => {
          item['@@child'] = item[$scope.options.childColumn];
          item['@@parent'] = item[$scope.options.parentColumn];
          item['@@size'] = item[$scope.options.sizeColumn];
          item['@@rownum'] = index;
        });

        const treeData = [];
        // eslint-disable-next-line prefer-arrow-callback
        queryData.forEach(function makeTree(node) {
          // add to parent
          const parent = dataMap[node[$scope.options.parentColumn]];
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
          const container = element[0].querySelector('.treemap-visualization-container');
          angular.element(container).empty();
          createTreemap(container, treeData, $scope, $sanitize);
        }
      }

      $scope.$watch('queryResult && queryResult.getData()', refreshData);
      $scope.$watch('options', refreshData, true);
      $scope.handleResize = debounce(refreshData, 50);
    },
  };
}

function treemapEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
    scope: {
      queryResult: '=',
      options: '=?',
    },
    link($scope) {
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
}

export default function init(ngModule) {
  ngModule.directive('treemapRenderer', treemapRenderer);
  ngModule.directive('treemapEditor', treemapEditor);

  ngModule.config((VisualizationProvider) => {
    const editTemplate = '<treemap-editor options="visualization.options" query-result="queryResult"></treemap-editor>';

    VisualizationProvider.registerVisualization({
      type: 'TREEMAP',
      name: 'Treemap',
      renderTemplate: '<treemap-renderer options="visualization.options" query-result="queryResult"></treemap-renderer>',
      editorTemplate: editTemplate,
      defaultOptions: {
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
      },
    });
  });
}

