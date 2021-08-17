/* eslint-disable */

import d3 from "d3";

export interface LinkType {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  source: SourceTargetType;
  target: SourceTargetType;
}

export type SourceTargetType = {
  sourceLinks: Array<LinkType>;
  targetLinks: Array<LinkType>;
};

export type NodeType = LinkType & SourceTargetType;
export interface D3SankeyType {
  nodeWidth: (...args: any[]) => any;
  nodeHeight: (...args: any[]) => any;
  nodePadding: (...args: any[]) => any;
  nodes: (...args: any[]) => any[];
  link: (...args: any[]) => any;
  links: (...args: any[]) => any[];
  size: (...args: any[]) => any;
  layout: (...args: any[]) => any;
  relayout: (...args: any[]) => any;
}

export type DType = { sy: number; ty: number; value: number; source: LinkType; target: LinkType } & LinkType;

function center(node: any) {
  return node.y + node.dy / 2;
}

function value(link: any) {
  return link.value;
}

function Sankey(): D3SankeyType {
  const sankey = {};
  let nodeWidth = 24;
  let nodePadding = 8;
  let size = [1, 1];
  let nodes: any[] = [];
  let links: any[] = [];

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

  function moveSinksRight(x: any) {
    nodes.forEach(node => {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx: any) {
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
    let nextNodes: any;
    let x = 0;

    function assignBreadth(node: any) {
      node.x = x;
      node.dx = nodeWidth;
      node.sourceLinks.forEach((link: any) => {
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

    moveSinksRight(x);
    x = Math.max(
      d3.max(nodes, n => n.x),
      2
    ); // get new maximum x value (min 2)
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function computeNodeDepths(iterations: any) {
    const nodesByBreadth = d3
      // @ts-expect-error
      .nest()
      .key((d: any) => d.x)
      .sortKeys(d3.ascending)
      .entries(nodes)
      .map((d: any) => d.values);

    function initializeNodeDepth() {
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      const ky = d3.min(nodesByBreadth, n => (size[1] - (n.length - 1) * nodePadding) / d3.sum(n, value));

      nodesByBreadth.forEach((n: any) => {
        n.forEach((node: any, i: any) => {
          node.y = i;
          // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
          node.dy = node.value * ky;
        });
      });

      links.forEach(link => {
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        link.dy = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha: any) {
      function weightedSource(link: any) {
        return center(link.source) * link.value;
      }

      nodesByBreadth.forEach((n: any) => {
        n.forEach((node: any) => {
          if (node.targetLinks.length) {
            const y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });
    }

    function resolveCollisions() {
      nodesByBreadth.forEach((nodes: any) => {
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

    initializeNodeDepth();
    resolveCollisions();

    for (let alpha = 1; iterations > 0; iterations -= 1) {
      relaxRightToLeft((alpha *= 0.99));
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function relaxRightToLeft(alpha: any) {
      nodesByBreadth
        .slice()
        .reverse()
        .forEach((nodes: any) => {
          nodes.forEach((node: any) => {
            if (node.sourceLinks.length) {
              const y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
              node.y += (y - center(node)) * alpha;
            }
          });
        });

      function weightedTarget(link: any) {
        return center(link.target) * link.value;
      }
    }

    function ascendingDepth(a: any, b: any) {
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
      node.sourceLinks.forEach((link: any) => {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach((link: any) => {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a: any, b: any) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a: any, b: any) {
      return a.target.y - b.target.y;
    }
  }

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'nodeWidth' does not exist on type '{}'.
  sankey.nodeWidth = function(_: any) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'nodePadding' does not exist on type '{}'... Remove this comment to see the full error message
  sankey.nodePadding = function(_: any) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'nodes' does not exist on type '{}'.
  sankey.nodes = function(_: any) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'links' does not exist on type '{}'.
  sankey.links = function(_: any) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'size' does not exist on type '{}'.
  sankey.size = function(_: any) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'layout' does not exist on type '{}'.
  sankey.layout = function(iterations: any) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'relayout' does not exist on type '{}'.
  sankey.relayout = function() {
    computeLinkDepths();
    return sankey;
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'link' does not exist on type '{}'.
  sankey.link = function() {
    let curvature = 0.5;

    function link(d: DType) {
      const x0 = d.source.x + d.source.dx;
      const x1 = d.target.x;
      const xi = d3.interpolateNumber(x0, x1);
      const x2 = xi(curvature);
      const x3 = xi(1 - curvature);
      const y0 = d.source.y + d.sy + d.dy / 2;
      const y1 = d.target.y + d.ty + d.dy / 2;

      return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
    }

    link.curvature = (_: any) => {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  return sankey as D3SankeyType;
}

export default Sankey;
