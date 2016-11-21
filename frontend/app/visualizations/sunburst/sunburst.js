import d3 from 'd3';
import _ from 'underscore';
import angular from 'angular';

const exitNode = '<<<Exit>>>';
const colors = d3.scale.category10();

// helper function colorMap - color gray if "end" is detected
function colorMap(d) {
  return colors(d.name);
}


// Return array of ancestors of nodes, highest first, but excluding the root.
function getAncestors(node) {
  const path = [];
  let current = node;

  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

// The following is based on @chrisrzhou's example from: http://bl.ocks.org/chrisrzhou/d5bdd8546f64ca0e4366.
export default function Sunburst(scope, element) {
  this.element = element;
  this.watches = [];

  // svg dimensions
  const width = element[0].parentElement.clientWidth;
  const height = scope.visualization.options.height;
  const radius = Math.min(width, height) / 2;

  // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
  const b = {
    w: width / 6,
    h: 30,
    s: 3,
    t: 10,
  };

  // margins
  const margin = {
    top: radius,
    bottom: 50,
    left: radius,
    right: 0,
  };

  /**
   * Drawing variables:
   *
   * e.g. colors, totalSize, partitions, arcs
   */
  // Mapping of nodes to colorscale.

  // Total size of all nodes, to be used later when data is loaded
  let totalSize = 0;

  // create d3.layout.partition
  const partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(d =>
       d.size
    );

  // create arcs for drawing D3 paths
  const arc = d3.svg.arc()
    .startAngle(d =>
       d.x
    )
    .endAngle(d =>
       d.x + d.dx
    )
    .innerRadius(d =>
       Math.sqrt(d.y)
    )
    .outerRadius(d =>
       Math.sqrt(d.y + d.dy)
    );


  /**
   * Define and initialize D3 select references and div-containers
   *
   * e.g. vis, breadcrumbs, lastCrumb, summary, sunburst, legend
   */
  // create main vis selection
  const vis = d3.select(element[0])
    .append('div').classed('vis-container', true)
    .style('position', 'relative')
    .style('margin-top', '5px')
    .style('height', `${height + 2 * b.h}px`);

  // create and position breadcrumbs container and svg
  const breadcrumbs = vis
    .append('div').classed('breadcrumbs-container', true)
    .append('svg')
    .attr('width', width)
    .attr('height', b.h)
    .attr('fill', 'white')
    .attr('font-weight', 600);

  const marginLeft = (width - radius * 2) / 2;

  // create and position SVG
  const sunburst = vis
    .append('div').classed('sunburst-container', true)
    .style('z-index', '2')
    // .style("margin-left", marginLeft + "px")
    .style('left', `${marginLeft}px`)
    .style('position', 'absolute')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // create last breadcrumb element
  const lastCrumb = breadcrumbs.append('text').classed('lastCrumb', true);

  // create and position summary container
  const summary = vis
    .append('div').classed('summary-container', true)
    .style('position', 'absolute')
    .style('top', `${b.h + radius * 0.80}px`)
    .style('left', `${marginLeft + radius / 2}px`)
    .style('width', `${radius}px`)
    .style('height', `${radius}px`)
    .style('text-align', 'center')
    .style('font-size', '11px')
    .style('color', '#666')
    .style('z-index', '1');

  // Generate a string representation for drawing a breadcrumb polygon.
  function breadcrumbPoints(d, i) {
    const points = [];
    points.push('0,0');
    points.push(`${b.w},0`);
    points.push(`${b.w + b.t},${b.h / 2}`);
    points.push(`${b.w},${b.h}`);
    points.push(`0,${b.h}`);

    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
      points.push(`${b.t},${b.h / 2}`);
    }
    return points.join(' ');
  }

  // Update the breadcrumb breadcrumbs to show the current sequence and percentage.
  function updateBreadcrumbs(ancestors, percentageString) {
    // Data join, where primary key = name + depth.
    const g = breadcrumbs.selectAll('g')
      .data(ancestors, d =>
         d.name + d.depth
      );

    // Add breadcrumb and label for entering nodes.
    const breadcrumb = g.enter().append('g');

    breadcrumb
      .append('polygon').classed('breadcrumbs-shape', true)
      .attr('points', breadcrumbPoints)
      .attr('fill', colorMap);

    breadcrumb
      .append('text').classed('breadcrumbs-text', true)
      .attr('x', (b.w + b.t) / 2)
      .attr('y', b.h / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .text(d =>
         d.name
      );

    // Set position for entering and updating nodes.
    g.attr('transform', (d, i) =>
       `translate(${i * (b.w + b.s)}, 0)`
    );

    // Remove exiting nodes.
    g.exit().remove();

    // Update percentage at the lastCrumb.
    lastCrumb
      .attr('x', (ancestors.length + 0.5) * (b.w + b.s))
      .attr('y', b.h / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .attr('font-weight', 600)
      .text(percentageString);
  }

  // helper function mouseover to handle mouseover events/animations and calculation
  // of ancestor nodes etc
  function mouseover(d) {
    // build percentage string
    const percentage = (100 * d.value / totalSize).toPrecision(3);
    let percentageString = `${percentage}%`;
    if (percentage < 1) {
      percentageString = '< 1.0%';
    }

    // update breadcrumbs (get all ancestors)
    const ancestors = getAncestors(d);
    updateBreadcrumbs(ancestors, percentageString);

    // update sunburst (Fade all the segments and highlight only ancestors of current segment)
    sunburst.selectAll('path')
      .attr('opacity', 0.3);
    sunburst.selectAll('path')
      .filter(node =>
         (ancestors.indexOf(node) >= 0)
      )
      .attr('opacity', 1);

    // update summary
    summary.html(
      `Stage: ${d.depth}<br />` +
      `<span class='percentage' style='font-size: 2em;'>${percentageString}</span><br />${
      d.value} of ${totalSize}<br />`
    );

    // display summary and breadcrumbs if hidden
    summary.style('visibility', '');
    breadcrumbs.style('visibility', '');
  }


  // helper function click to handle mouseleave events/animations
  function click() {
    // Deactivate all segments then retransition each segment to full opacity.
    sunburst.selectAll('path').on('mouseover', null);
    sunburst.selectAll('path')
      .transition()
      .duration(1000)
      .attr('opacity', 1)
      .each('end', function endClick() {
        d3.select(this).on('mouseover', mouseover);
      });

    // hide summary and breadcrumbs if visible
    breadcrumbs.style('visibility', 'hidden');
    summary.style('visibility', 'hidden');
  }

  // helper function to draw the sunburst and breadcrumbs
  function drawSunburst(json) {
    // Build only nodes of a threshold "visible" sizes to improve efficiency
    const nodes = partition.nodes(json)
      .filter(d =>
         (d.dx > 0.005) && d.name !== exitNode // 0.005 radians = 0.29 degrees
      );

    // this section is required to update the colors.domain() every time the data updates
    const uniqueNames = (function uniqueNames(a) {
      const output = [];
      a.forEach((d) => {
        if (output.indexOf(d.name) === -1) output.push(d.name);
      });
      return output;
    }(nodes));
    colors.domain(uniqueNames); // update domain colors

    // create path based on nodes
    const path = sunburst.data([json]).selectAll('path')
      .data(nodes).enter()
      .append('path')
      .classed('nodePath', true)
      .attr('display', d => (d.depth ? null : 'none'))
      .attr('d', arc)
      .attr('fill', colorMap)
      .attr('opacity', 1)
      .attr('stroke', 'white')
      .on('mouseover', mouseover);


    // // trigger mouse click over sunburst to reset visualization summary
    vis.on('click', click);

    // Update totalSize of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;
  }

  // visualize json tree structure
  function createVisualization(json) {
    drawSunburst(json); // draw sunburst
  }

  function removeVisualization() {
    sunburst.selectAll('.nodePath').remove();
    // legend.selectAll("g").remove();
  }

  function buildNodes(raw) {
    let values;

    if (_.has(raw[0], 'sequence') && _.has(raw[0], 'stage') && _.has(raw[0], 'node') && _.has(raw[0], 'value')) {
      const grouped = _.groupBy(raw, 'sequence');

      values = _.map(grouped, (value) => {
        const sorted = _.sortBy(value, 'stage');
        return {
          size: value[0].value,
          sequence: value[0].sequence,
          nodes: _.pluck(sorted, 'node'),
        };
      });
    } else {
      const keys = _.sortBy(_.without(_.keys(raw[0]), 'value'), _.identity);

      values = _.map(raw, (row, sequence) =>
         ({
           size: row.value,
           sequence,
           nodes: _.compact(_.map(keys, key => row[key])),
         })
      );
    }

    return values;
  }

  function buildHierarchy(csv) {
    const data = buildNodes(csv);

    // build tree
    const root = {
      name: 'root',
      children: [],
    };

    data.forEach((d) => {
      const nodes = d.nodes;
      const size = parseInt(d.size, 10);

      // build graph, nodes, and child nodes
      let currentNode = root;
      for (let j = 0; j < nodes.length; j += 1) {
        let children = currentNode.children;
        const nodeName = nodes[j];
        const isLeaf = j + 1 === nodes.length;


        if (!children) {
          currentNode.children = children = [];
          children.push({
            name: exitNode,
            size: currentNode.size,
          });
        }

        let childNode = _.find(children, child => child.name === nodeName);

        if (isLeaf && childNode) {
          childNode.children.push({
            name: exitNode,
            size,
          });
        } else if (isLeaf) {
          children.push({
            name: nodeName,
            size,
          });
        } else {
          if (!childNode) {
            childNode = {
              name: nodeName,
              children: [],
            };
            children.push(childNode);
          }

          currentNode = childNode;
        }
      }
    });

    return root;
  }

  function render(data) {
    const json = buildHierarchy(data); // build json tree
    removeVisualization(); // remove existing visualization if any
    createVisualization(json); // visualize json tree
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

Sunburst.prototype.remove = function remove() {
  this.watches.forEach((unregister) => { unregister(); });
  angular.element(this.element[0]).empty('.vis-container');
};
