import { map, each } from "lodash";
import d3 from "d3";
import React, { useState, useEffect } from "react";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations";
import box from "./d3box";
import "./renderer.less";

function calcIqr(k) {
  return d => {
    const q1 = d.quartiles[0];
    const q3 = d.quartiles[2];
    const iqr = (q3 - q1) * k;

    let i = -1;
    let j = d.length;

    i += 1;
    while (d[i] < q1 - iqr) {
      i += 1;
    }

    j -= 1;
    while (d[j] > q3 + iqr) {
      j -= 1;
    }

    return [i, j];
  };
}

function render(container, data, { xAxisLabel, yAxisLabel }) {
  container = d3.select(container);

  const containerBounds = container.node().getBoundingClientRect();
  const containerWidth = Math.floor(containerBounds.width);
  const containerHeight = Math.floor(containerBounds.height);

  const margin = {
    top: 10,
    right: 50,
    bottom: 40,
    left: 50,
    inner: 25,
  };
  const width = containerWidth - margin.right - margin.left;
  const height = containerHeight - margin.top - margin.bottom;

  let min = Infinity;
  let max = -Infinity;
  const mydata = [];
  let value = 0;
  let d = [];

  const columns = map(data.columns, col => col.name);
  const xscale = d3.scale
    .ordinal()
    .domain(columns)
    .rangeBands([0, containerWidth - margin.left - margin.right]);

  let boxWidth;
  if (columns.length > 1) {
    boxWidth = Math.min(xscale(columns[1]), 120.0);
  } else {
    boxWidth = 120.0;
  }
  margin.inner = boxWidth / 3.0;

  each(columns, (column, i) => {
    d = mydata[i] = [];
    each(data.rows, row => {
      value = row[column];
      d.push(value);
      if (value > max) max = Math.ceil(value);
      if (value < min) min = Math.floor(value);
    });
  });

  const yscale = d3.scale
    .linear()
    .domain([min * 0.99, max * 1.01])
    .range([height, 0]);

  const chart = box()
    .whiskers(calcIqr(1.5))
    .width(boxWidth - 2 * margin.inner)
    .height(height)
    .domain([min * 0.99, max * 1.01]);
  const xAxis = d3.svg
    .axis()
    .scale(xscale)
    .orient("bottom");

  const yAxis = d3.svg
    .axis()
    .scale(yscale)
    .orient("left");

  const xLines = d3.svg
    .axis()
    .scale(xscale)
    .tickSize(height)
    .orient("bottom");

  const yLines = d3.svg
    .axis()
    .scale(yscale)
    .tickSize(width)
    .orient("right");

  function barOffset(i) {
    return xscale(columns[i]) + (xscale(columns[1]) - margin.inner) / 2.0;
  }

  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", height + margin.bottom + margin.top);

  const plot = svg
    .append("g")
    .attr("width", containerWidth - margin.left - margin.right)
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("class", "box")
    .attr("x", containerWidth / 2.0)
    .attr("text-anchor", "middle")
    .attr("y", height + margin.bottom)
    .text(xAxisLabel);

  svg
    .append("text")
    .attr("class", "box")
    .attr("transform", `translate(10,${(height + margin.top + margin.bottom) / 2.0})rotate(-90)`)
    .attr("text-anchor", "middle")
    .text(yAxisLabel);

  plot
    .append("rect")
    .attr("class", "grid-background")
    .attr("width", width)
    .attr("height", height);

  plot
    .append("g")
    .attr("class", "grid")
    .call(yLines);

  plot
    .append("g")
    .attr("class", "grid")
    .call(xLines);

  plot
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  plot
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  plot
    .selectAll(".box")
    .data(mydata)
    .enter()
    .append("g")
    .attr("class", "box")
    .attr("width", boxWidth)
    .attr("height", height)
    .attr("transform", (_, i) => `translate(${barOffset(i)},${0})`)
    .call(chart);
}

export default function Renderer({ data, options }) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    if (container) {
      render(container, data, options);
      const unwatch = resizeObserver(container, () => {
        render(container, data, options);
      });
      return unwatch;
    }
  }, [container, data, options]);

  return <div className="box-plot-deprecated-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
