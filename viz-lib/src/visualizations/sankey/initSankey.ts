import { isNil, map, extend, sortBy, includes, filter, reduce, find, keys, values, identity } from "lodash";
import d3 from "d3";
import d3sankey from "./d3sankey";

function getConnectedNodes(node: any) {
  // source link = this node is the source, I need the targets
  const nodes: any = [];
  node.sourceLinks.forEach((link: any) => {
    nodes.push(link.target);
  });
  node.targetLinks.forEach((link: any) => {
    nodes.push(link.source);
  });

  return nodes;
}

function graph(data: any) {
  const nodesDict = {};
  const links = {};
  const nodes: any = [];

  const validKey = (key: any) => key !== "value";
  const dataKeys = sortBy(filter(keys(data[0]), validKey), identity);

  function normalizeName(name: any) {
    if (!isNil(name)) {
      return "" + name;
    }

    return "Exit";
  }

  function getNode(name: any, level: any) {
    name = normalizeName(name);
    const key = `${name}:${String(level)}`;
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    let node = nodesDict[key];
    if (!node) {
      node = { name };
      node.id = nodes.push(node) - 1;
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      nodesDict[key] = node;
    }
    return node;
  }

  function getLink(source: any, target: any) {
    // @ts-expect-error ts-migrate(2538) FIXME: Type 'any[]' cannot be used as an index type.
    let link = links[[source, target]];
    if (!link) {
      link = { target, source, value: 0 };
      // @ts-expect-error ts-migrate(2538) FIXME: Type 'any[]' cannot be used as an index type.
      links[[source, target]] = link;
    }

    return link;
  }

  function addLink(sourceName: any, targetName: any, value: any, depth: any) {
    if ((sourceName === "" || !sourceName) && depth > 1) {
      return;
    }

    const source = getNode(sourceName, depth);
    const target = getNode(targetName, depth + 1);
    const link = getLink(source.id, target.id);
    link.value += parseInt(value, 10);
  }

  data.forEach((row: any) => {
    addLink(row[dataKeys[0]], row[dataKeys[1]], row.value || 0, 1);
    addLink(row[dataKeys[1]], row[dataKeys[2]], row.value || 0, 2);
    addLink(row[dataKeys[2]], row[dataKeys[3]], row.value || 0, 3);
    addLink(row[dataKeys[3]], row[dataKeys[4]], row.value || 0, 4);
    addLink(row[dataKeys[4]], null, row.value || 0, 5); // this line ensures that the last stage has a corresponding exit node
  });

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'scale' does not exist on type 'typeof im... Remove this comment to see the full error message
  const color = d3.scale.category20();

  return {
    nodes: map(nodes, d => extend(d, { color: color(d.name.replace(/ .*/, "")) })),
    links: values(links),
  };
}

function spreadNodes(height: any, data: any) {
  const nodesByBreadth = d3
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'nest' does not exist on type 'typeof imp... Remove this comment to see the full error message
    .nest()
    .key((d: any) => d.x)
    .entries(data.nodes)
    .map((d: any) => d.values);

  nodesByBreadth.forEach((nodes: any) => {
    nodes = filter(
      sortBy(nodes, node => -node.value),
      node => node.name !== "Exit"
    );

    // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
    const sum = d3.sum(nodes, o => o.dy);
    const padding = (height - sum) / nodes.length;

    reduce(
      nodes,
      (y0, node) => {
        node.y = y0;
        return y0 + node.dy + padding;
      },
      0
    );
  });
}

function isDataValid(data: any) {
  // data should contain column named 'value', otherwise no reason to render anything at all
  return data && !!find(data.columns, c => c.name === "value");
}

export default function initSankey(data: any) {
  if (!isDataValid(data)) {
    return (element: any) => {
      d3.select(element)
        .selectAll("*")
        .remove();
    };
  }

  data = graph(data.rows);
  const format = (d: any) => d3.format(",.0f")(d); // TODO: editor option ?

  return (element: any) => {
    d3.select(element)
      .selectAll("*")
      .remove();

    const margin = {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    };
    const width = element.offsetWidth - margin.left - margin.right;
    const height = element.offsetHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) {
      return;
    }

    // append the svg canvas to the page
    const svg = d3
      .select(element)
      .append("svg")
      .attr("class", "sankey")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set the sankey diagram properties
    const sankey = d3sankey()
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'nodeWidth' does not exist on type '{}'.
      .nodeWidth(15)
      .nodePadding(10)
      .size([width, height]);

    const path = sankey.link();

    sankey
      .nodes(data.nodes)
      .links(data.links)
      .layout(0);

    spreadNodes(height, data);
    sankey.relayout();

    // add in the links
    const link = svg
      .append("g")
      .selectAll(".link")
      .data(data.links)
      .enter()
      .append("path")
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .filter(l => l.target.name !== "Exit")
      .attr("class", "link")
      .attr("d", path)
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .style("stroke-width", d => Math.max(1, d.dy))
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .sort((a, b) => b.dy - a.dy);

    // add the link titles
    // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
    link.append("title").text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)}`);

    const node = svg
      .append("g")
      .selectAll(".node")
      .data(data.nodes)
      .enter()
      .append("g")
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .filter(n => n.name !== "Exit")
      .attr("class", "node")
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .attr("transform", d => `translate(${d.x},${d.y})`);

    function nodeMouseOver(currentNode: any) {
      let nodes = getConnectedNodes(currentNode);
      nodes = map(nodes, i => i.id);
      node
        .filter(d => {
          if (d === currentNode) {
            return false;
          }
          // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
          return !includes(nodes, d.id);
        })
        .style("opacity", 0.2);
      link
        .filter(l => !(includes(currentNode.sourceLinks, l) || includes(currentNode.targetLinks, l)))
        .style("opacity", 0.2);
    }

    function nodeMouseOut() {
      node.style("opacity", 1);
      link.style("opacity", 1);
    }

    // add in the nodes
    node.on("mouseover", nodeMouseOver).on("mouseout", nodeMouseOut);

    // add the rectangles for the nodes
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    node
      .append("rect")
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .attr("height", d => d.dy)
      .attr("width", sankey.nodeWidth())
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .style("fill", d => d.color)
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .style("stroke", d => d3.rgb(d.color).darker(2))
      .append("title")
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .text(d => `${d.name}\n${format(d.value)}`);

    // add in the title for the nodes
    node
      .append("text")
      .attr("x", -6)
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .attr("y", d => d.dy / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .text(d => d.name)
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      .filter(d => d.x < width / 2)
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");
  };
}
