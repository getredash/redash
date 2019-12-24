/**
 * The following is based on @chrisrzhou's example from: http://bl.ocks.org/chrisrzhou/d5bdd8546f64ca0e4366.
 */

import * as d3 from "d3";
import { has, map, keys, groupBy, sortBy, filter, find, compact, first, every, identity } from "lodash";

const exitNode = "<<<Exit>>>";
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

function buildNodesFromHierarchyData(data) {
  const grouped = groupBy(data, "sequence");

  return map(grouped, value => {
    const sorted = sortBy(value, "stage");
    return {
      size: value[0].value || 0,
      sequence: value[0].sequence,
      nodes: map(sorted, i => i.node),
    };
  });
}

function buildNodesFromTableData(data) {
  // ANGULAR_REMOVE_ME $$ check is for Angular's internal properties
  const validKey = key => key !== "value" && key.indexOf("$$") !== 0;
  const dataKeys = sortBy(filter(keys(data[0]), validKey), identity);

  return map(data, (row, sequence) => ({
    size: row.value || 0,
    sequence,
    nodes: compact(map(dataKeys, key => row[key])),
  }));
}

function isDataInHierarchyFormat(data) {
  const firstRow = first(data);
  return every(["sequence", "stage", "node", "value"], field => has(firstRow, field));
}

function buildHierarchy(data) {
  data = isDataInHierarchyFormat(data) ? buildNodesFromHierarchyData(data) : buildNodesFromTableData(data);

  // build tree
  const root = {
    name: "root",
    children: [],
  };

  data.forEach(d => {
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

      let childNode = find(children, child => child.name === nodeName);

      if (isLeaf && childNode) {
        childNode.children = childNode.children || [];
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

function isDataValid(data) {
  return data && data.rows.length > 0;
}

export default function initSunburst(data) {
  if (!isDataValid(data)) {
    return element => {
      d3.select(element)
        .selectAll("*")
        .remove();
    };
  }

  data = buildHierarchy(data.rows);

  return element => {
    d3.select(element)
      .selectAll("*")
      .remove();

    // svg dimensions
    const width = element.clientWidth;
    const height = element.offsetHeight;

    // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
    const b = {
      w: width / 6,
      h: 30,
      s: 3,
      t: 10,
    };

    const radius = Math.min(width - b.h, height - b.h) / 2 - 5;
    if (radius <= 0) {
      return;
    }

    // margins
    const margin = {
      top: radius,
      bottom: 50,
      left: radius,
      right: 0,
    };

    // Drawing variables: e.g. colors, totalSize, partitions, arcs

    // Total size of all nodes, to be used later when data is loaded
    let totalSize = 0;

    // create d3.layout.partition
    const partition = d3.layout
      .partition()
      .size([2 * Math.PI, radius * radius])
      .value(d => d.size);

    // create arcs for drawing D3 paths
    const arc = d3.svg
      .arc()
      .startAngle(d => d.x)
      .endAngle(d => d.x + d.dx)
      .innerRadius(d => Math.sqrt(d.y))
      .outerRadius(d => Math.sqrt(d.y + d.dy));

    /**
     * Define and initialize D3 select references and div-containers
     *
     * e.g. vis, breadcrumbs, lastCrumb, summary, sunburst, legend
     */
    const vis = d3.select(element);

    // create and position breadcrumbs container and svg
    const breadcrumbs = vis
      .append("div")
      .classed("breadcrumbs-container", true)
      .append("svg")
      .attr("width", width)
      .attr("height", b.h)
      .attr("fill", "white")
      .attr("font-weight", 600);

    // create and position SVG
    const container = vis.append("div");

    // create and position summary container
    const summary = container.append("div").classed("summary-container", true);

    const sunburst = container
      .append("div")
      .classed("sunburst-container", true)
      .append("svg")
      .attr("width", radius * 2)
      .attr("height", radius * 2)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // create last breadcrumb element
    const lastCrumb = breadcrumbs.append("text").classed("lastCrumb", true);

    // Generate a string representation for drawing a breadcrumb polygon.
    function breadcrumbPoints(d, i) {
      const points = [];
      points.push("0,0");
      points.push(`${b.w},0`);
      points.push(`${b.w + b.t},${b.h / 2}`);
      points.push(`${b.w},${b.h}`);
      points.push(`0,${b.h}`);

      if (i > 0) {
        // Leftmost breadcrumb; don't include 6th vertex.
        points.push(`${b.t},${b.h / 2}`);
      }
      return points.join(" ");
    }

    // Update the breadcrumb breadcrumbs to show the current sequence and percentage.
    function updateBreadcrumbs(ancestors, percentageString) {
      // Data join, where primary key = name + depth.
      const g = breadcrumbs.selectAll("g").data(ancestors, d => d.name + d.depth);

      // Add breadcrumb and label for entering nodes.
      const breadcrumb = g.enter().append("g");

      breadcrumb
        .append("polygon")
        .classed("breadcrumbs-shape", true)
        .attr("points", breadcrumbPoints)
        .attr("fill", colorMap);

      breadcrumb
        .append("text")
        .classed("breadcrumbs-text", true)
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(d => d.name);

      // Set position for entering and updating nodes.
      g.attr("transform", (d, i) => `translate(${i * (b.w + b.s)}, 0)`);

      // Remove exiting nodes.
      g.exit().remove();

      // Update percentage at the lastCrumb.
      lastCrumb
        .attr("x", (ancestors.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .attr("font-weight", 600)
        .text(percentageString);
    }

    // helper function mouseover to handle mouseover events/animations and calculation
    // of ancestor nodes etc
    function mouseover(d) {
      // build percentage string
      const percentage = ((100 * d.value) / totalSize).toPrecision(3);
      let percentageString = `${percentage}%`;
      if (percentage < 1) {
        percentageString = "< 1.0%";
      }

      // update breadcrumbs (get all ancestors)
      const ancestors = getAncestors(d);
      updateBreadcrumbs(ancestors, percentageString);

      // update sunburst (Fade all the segments and highlight only ancestors of current segment)
      sunburst.selectAll("path").attr("opacity", 0.3);
      sunburst
        .selectAll("path")
        .filter(node => ancestors.indexOf(node) >= 0)
        .attr("opacity", 1);

      // update summary
      summary.html(`
      <span>Stage: ${d.depth}</span>
      <span class='percentage' style='font-size: 2em;'>${percentageString}</span>
      <span>${d.value} of ${totalSize}</span>
    `);

      // display summary and breadcrumbs if hidden
      summary.style("visibility", "");
      breadcrumbs.style("visibility", "");
    }

    // helper function click to handle mouseleave events/animations
    function click() {
      // Deactivate all segments then retransition each segment to full opacity.
      sunburst.selectAll("path").on("mouseover", null);
      sunburst
        .selectAll("path")
        .transition()
        .duration(1000)
        .attr("opacity", 1)
        .each("end", function endClick() {
          d3.select(this).on("mouseover", mouseover);
        });

      // hide summary and breadcrumbs if visible
      breadcrumbs.style("visibility", "hidden");
      summary.style("visibility", "hidden");
    }

    // Build only nodes of a threshold "visible" sizes to improve efficiency
    // 0.005 radians = 0.29 degrees
    const nodes = partition.nodes(data).filter(d => d.dx > 0.005 && d.name !== exitNode);

    // this section is required to update the colors.domain() every time the data updates
    const uniqueNames = (function uniqueNames(a) {
      const output = [];
      a.forEach(d => {
        if (output.indexOf(d.name) === -1) output.push(d.name);
      });
      return output;
    })(nodes);
    colors.domain(uniqueNames); // update domain colors

    // create path based on nodes
    const path = sunburst
      .data([data])
      .selectAll("path")
      .data(nodes)
      .enter()
      .append("path")
      .classed("nodePath", true)
      .attr("display", d => (d.depth ? null : "none"))
      .attr("d", arc)
      .attr("fill", colorMap)
      .attr("opacity", 1)
      .attr("stroke", "white")
      .on("mouseover", mouseover);

    // // trigger mouse click over sunburst to reset visualization summary
    vis.on("click", click);

    // Update totalSize of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;
  };
}
