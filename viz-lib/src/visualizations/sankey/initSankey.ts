import {
  isNil,
  map,
  extend,
  sortBy,
  includes,
  filter,
  reduce,
  find,
  keys,
  values,
  identity,
  mapValues,
  every,
  isNaN,
  isNumber,
  isString,
} from "lodash";
import d3 from "d3";
import d3sankey, { NodeType, LinkType, SourceTargetType, DType } from "./d3sankey";
import { SankeyDataType } from ".";

export type ExtendedSankeyDataType = Partial<SankeyDataType> & { nodes: any[]; links: any[] };

function getConnectedNodes(node: NodeType) {
  console.log(node);
  // source link = this node is the source, I need the targets
  const nodes: any = [];
  node.sourceLinks.forEach((link: LinkType) => {
    nodes.push(link.target);
  });
  node.targetLinks.forEach((link: LinkType) => {
    nodes.push(link.source);
  });

  return nodes;
}

function graph(data: ExtendedSankeyDataType["rows"]) {
  const nodesDict = {};
  const links = {};
  const nodes: any[] = [];

  const validKey = (key: any) => key !== "value";
  // @ts-expect-error
  const dataKeys = sortBy(filter(keys(data[0]), validKey), identity);

  function normalizeName(name: any) {
    if (!isNil(name)) {
      return "" + name;
    }

    return "Exit";
  }

  function getNode(name: string, level: any) {
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

  function getLink(source: SourceTargetType, target: SourceTargetType) {
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

  // @ts-expect-error
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

function spreadNodes(height: any, data: ExtendedSankeyDataType) {
  const nodesByBreadth = d3
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'nest' does not exist on type 'typeof imp... Remove this comment to see the full error message
    .nest()
    .key((d: DType) => d.x)
    .entries(data.nodes)
    // @ts-expect-error
    .map((d: DType) => d.values);

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

function isDataValid(data: ExtendedSankeyDataType) {
  // data should contain column named 'value', otherwise no reason to render anything at all
  if (!data || !find(data.columns, c => c.name === "value")) {
    return false;
  }
  // prepareData will have coerced any invalid data rows into NaN, which is verified below
  return every(data.rows, row =>
    every(row, v => {
      if (!v || isString(v)) {
        return true;
      }
      return isFinite(v);
    })
  );
}

// will coerce number strings into valid numbers
function prepareDataRows(rows: ExtendedSankeyDataType["rows"]) {
  return map(rows, row =>
    mapValues(row, v => {
      if (!v || isNumber(v)) {
        return v;
      }
      return isNaN(parseFloat(v)) ? v : parseFloat(v);
    })
  );
}

export default function initSankey(data: ExtendedSankeyDataType) {
  data.rows = prepareDataRows(data.rows) as ExtendedSankeyDataType["rows"];

  if (!isDataValid(data)) {
    return (element: HTMLDivElement) => {
      d3.select(element)
        .selectAll("*")
        .remove();
    };
  }

  data = graph(data.rows);
  // @ts-expect-error
  const format = (d: DType) => d3.format(",.0f")(d); // TODO: editor option ?

  return (element: HTMLDivElement) => {
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
    const svg: d3.Selection<SVGGElement, any, any, any> = d3
      .select(element)
      .append("svg")
      .attr("class", "sankey")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set the sankey diagram properties
    const sankey = d3sankey()
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
      .filter(l => l.target.name !== "Exit")
      .attr("class", "link")
      .attr("d", path)
      .style("stroke-width", d => Math.max(1, d.dy))
      .sort((a, b) => b.dy - a.dy);

    // add the link titles
    link.append("title").text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)}`);

    const node = svg
      .append("g")
      .selectAll(".node")
      .data(data.nodes)
      .enter()
      .append("g")
      .filter(n => n.name !== "Exit")
      .attr("class", "node")
      .attr("transform", (d: DType) => `translate(${d.x},${d.y})`);

    function nodeMouseOver(currentNode: NodeType) {
      let nodes = getConnectedNodes(currentNode);
      nodes = map(nodes, i => i.id);
      node
        .filter(d => {
          if (d === currentNode) {
            return false;
          }
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
    // FIXME: d is DType, but d3 will not accept a nonstandard function
    node
      .append("rect")
      .attr("height", (d: any) => d.dy)
      .attr("width", sankey.nodeWidth())
      .style("fill", (d: any) => d.color)
      // @ts-expect-error
      .style("stroke", (d: any) => d3.rgb(d.color).darker(2))
      .append("title")
      .text((d: any) => `${d.name}\n${format(d.value)}`);

    // add in the title for the nodes
    node
      .append("text")
      .attr("x", -6)
      .attr("y", (d: any) => d.dy / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      .text((d: any) => d.name)
      .filter((d: any) => d.x < width / 2)
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");
  };
}
