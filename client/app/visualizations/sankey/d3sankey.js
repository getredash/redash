/* eslint-disable */

import d3 from "d3";

function center(node) {
  return node.y + node.dy / 2;
}

function value(link) {
  return link.value;
}

function Sankey() {
  const sankey = {};
  let nodeWidth = 24;
  let nodePadding = 8;
  let size = [1, 1];
  let nodes = [];
  let links = [];

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    nodes.forEach(node => {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(link => {
      let source = link.source;
      let target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    nodes.forEach(node => {
      node.value = Math.max(d3.sum(node.sourceLinks, value), d3.sum(node.targetLinks, value));
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(node => {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx) {
    nodes.forEach(node => {
      node.x *= kx;
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {
    let remainingNodes = nodes;
    let nextNodes;
    let x = 0;

    function assignBreadth(node) {
      node.x = x;
      node.dx = nodeWidth;
      node.sourceLinks.forEach(link => {
        if (nextNodes.indexOf(link.target) < 0) {
          nextNodes.push(link.target);
        }
      });
    }

    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(assignBreadth);
      remainingNodes = nextNodes;
      x += 1;
    }

    //
    moveSinksRight(x);
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function moveSourcesRight() {
    nodes.forEach(node => {
      if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, d => d.target.x) - 1;
      }
    });
  }

  function computeNodeDepths(iterations) {
    const nodesByBreadth = d3
      .nest()
      .key(d => d.x)
      .sortKeys(d3.ascending)
      .entries(nodes)
      .map(d => d.values);

    function initializeNodeDepth() {
      const ky = d3.min(nodesByBreadth, n => (size[1] - (n.length - 1) * nodePadding) / d3.sum(n, value));

      nodesByBreadth.forEach(n => {
        n.forEach((node, i) => {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(link => {
        link.dy = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha) {
      function weightedSource(link) {
        return center(link.source) * link.value;
      }

      nodesByBreadth.forEach(n => {
        n.forEach(node => {
          if (node.targetLinks.length) {
            const y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(nodes => {
        const n = nodes.length;
        let node;
        let dy;
        let y0 = 0;
        let i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(nodes => {
        let node,
          dy,
          y0 = 0,
          n = nodes.length,
          i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    initializeNodeDepth();
    resolveCollisions();

    for (let alpha = 1; iterations > 0; iterations -= 1) {
      relaxRightToLeft((alpha *= 0.99));
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function relaxRightToLeft(alpha) {
      nodesByBreadth
        .slice()
        .reverse()
        .forEach(nodes => {
          nodes.forEach(node => {
            if (node.sourceLinks.length) {
              const y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
              node.y += (y - center(node)) * alpha;
            }
          });
        });

      function weightedTarget(link) {
        return center(link.target) * link.value;
      }
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }

  function computeLinkDepths() {
    nodes.forEach(node => {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(node => {
      let sy = 0,
        ty = 0;
      node.sourceLinks.forEach(link => {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(link => {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  sankey.nodeWidth = function(_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function(_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function(_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function(_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.layout = function(iterations) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function() {
    computeLinkDepths();
    return sankey;
  };

  sankey.link = function() {
    let curvature = 0.5;

    function link(d) {
      const x0 = d.source.x + d.source.dx;
      const x1 = d.target.x;
      const xi = d3.interpolateNumber(x0, x1);
      const x2 = xi(curvature);
      const x3 = xi(1 - curvature);
      const y0 = d.source.y + d.sy + d.dy / 2;
      const y1 = d.target.y + d.ty + d.dy / 2;

      return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
    }

    link.curvature = _ => {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  return sankey;
}

export default Sankey;
