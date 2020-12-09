/* eslint-disable */
// Inspired by http://informationandvisualization.de/blog/box-plot
function box() {
  let width = 1,
    height = 1,
    duration = 0,
    domain: any = null,
    value = Number,
    whiskers = boxWhiskers,
    quartiles = boxQuartiles,
    tickFormat: any = null;

  // For each small multiple…
  function box(g: any) {
    g.each(function(d: any, i: any) {
      d = d.map(value).sort(d3.ascending);
      // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
      let g = d3.select(this),
        n = d.length,
        min = d[0],
        max = d[n - 1];

      // Compute quartiles. Must return exactly 3 elements.
      const quartileData = (d.quartiles = quartiles(d));

      // Compute whiskers. Must return exactly 2 elements, or null.
      // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
      let whiskerIndices = whiskers && whiskers.call(this, d, i),
        whiskerData = whiskerIndices && whiskerIndices.map(i => d[i]);

      // Compute outliers. If no whiskers are specified, all data are "outliers".
      // We compute the outliers as indices, so that we can join across transitions!
      const outlierIndices = whiskerIndices
        ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
        : d3.range(n);

      // Compute the new x-scale.
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'scale' does not exist on type 'typeof im... Remove this comment to see the full error message
      const x1 = d3.scale
        .linear()
        // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
        .domain((domain && domain.call(this, d, i)) || [min, max])
        .range([height, 0]);

      // Retrieve the old x-scale, if this is an update.
      const x0 =
        // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
        this.__chart__ ||
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'scale' does not exist on type 'typeof im... Remove this comment to see the full error message
        d3.scale
          .linear()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
      this.__chart__ = x1;

      // Note: the box, median, and box tick elements are fixed in number,
      // so we only have to handle enter and update. In contrast, the outliers
      // and other elements are variable, so we need to exit them! Variable
      // elements also fade in and out.

      // Update center line: the vertical line spanning the whiskers.
      const center = g.selectAll("line.center").data(whiskerData ? [whiskerData] : []);

      center
        .enter()
        .insert("line", "rect")
        .attr("class", "center")
        .attr("x1", width / 2)
        .attr("y1", d => x0(d[0]))
        .attr("x2", width / 2)
        .attr("y2", d => x0(d[1]))
        .style("opacity", 1e-6)
        .transition()
        .duration(duration)
        .style("opacity", 1)
        .attr("y1", d => x1(d[0]))
        .attr("y2", d => x1(d[1]));

      center
        .transition()
        .duration(duration)
        .style("opacity", 1)
        .attr("y1", d => x1(d[0]))
        .attr("y2", d => x1(d[1]));

      center
        .exit()
        .transition()
        .duration(duration)
        .style("opacity", 1e-6)
        // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
        .attr("y1", d => x1(d[0]))
        // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
        .attr("y2", d => x1(d[1]))
        .remove();

      // Update innerquartile box.
      const box = g.selectAll("rect.box").data([quartileData]);

      box
        .enter()
        .append("rect")
        .attr("class", "box")
        .attr("x", 0)
        .attr("y", d => x0(d[2]))
        .attr("width", width)
        .attr("height", d => x0(d[0]) - x0(d[2]))
        .transition()
        .duration(duration)
        .attr("y", d => x1(d[2]))
        .attr("height", d => x1(d[0]) - x1(d[2]));

      box
        .transition()
        .duration(duration)
        .attr("y", d => x1(d[2]))
        .attr("height", d => x1(d[0]) - x1(d[2]));

      box.exit().remove();

      // Update median line.
      const medianLine = g.selectAll("line.median").data([quartileData[1]]);

      medianLine
        .enter()
        .append("line")
        .attr("class", "median")
        .attr("x1", 0)
        .attr("y1", x0)
        .attr("x2", width)
        .attr("y2", x0)
        .transition()
        .duration(duration)
        .attr("y1", x1)
        .attr("y2", x1);

      medianLine
        .transition()
        .duration(duration)
        .attr("y1", x1)
        .attr("y2", x1);

      medianLine.exit().remove();

      // Update whiskers.
      const whisker = g.selectAll("line.whisker").data(whiskerData || []);

      whisker
        .enter()
        .insert("line", "circle, text")
        .attr("class", "whisker")
        .attr("x1", 0)
        .attr("y1", x0)
        .attr("x2", width)
        .attr("y2", x0)
        .style("opacity", 1e-6)
        .transition()
        .duration(duration)
        .attr("y1", x1)
        .attr("y2", x1)
        .style("opacity", 1);

      whisker
        .transition()
        .duration(duration)
        .attr("y1", x1)
        .attr("y2", x1)
        .style("opacity", 1);

      whisker
        .exit()
        .transition()
        .duration(duration)
        .attr("y1", x1)
        .attr("y2", x1)
        .style("opacity", 1e-6)
        .remove();

      // Update outliers.
      const outlier = g.selectAll("circle.outlier").data(outlierIndices, Number);

      outlier
        .enter()
        .insert("circle", "text")
        .attr("class", "outlier")
        .attr("r", 5)
        .attr("cx", width / 2)
        .attr("cy", i => x0(d[i]))
        .style("opacity", 1e-6)
        .transition()
        .duration(duration)
        .attr("cy", i => x1(d[i]))
        .style("opacity", 1);

      outlier
        .transition()
        .duration(duration)
        .attr("cy", i => x1(d[i]))
        .style("opacity", 1);

      outlier
        .exit()
        .transition()
        .duration(duration)
        // @ts-expect-error ts-migrate(2538) FIXME: Type 'unknown' cannot be used as an index type.
        .attr("cy", i => x1(d[i]))
        .style("opacity", 1e-6)
        .remove();

      // Compute the tick format.
      const format = tickFormat || x1.tickFormat(8);

      // Update box ticks.
      const boxTick = g.selectAll("text.box").data(quartileData);

      boxTick
        .enter()
        .append("text")
        .attr("class", "box")
        .attr("dy", ".3em")
        .attr("dx", (d, i) => (i & 1 ? 6 : -6))
        .attr("x", (d, i) => (i & 1 ? width : 0))
        .attr("y", x0)
        .attr("text-anchor", (d, i) => (i & 1 ? "start" : "end"))
        .text(format)
        .transition()
        .duration(duration)
        .attr("y", x1);

      boxTick
        .transition()
        .duration(duration)
        .text(format)
        .attr("y", x1);

      boxTick.exit().remove();

      // Update whisker ticks. These are handled separately from the box
      // ticks because they may or may not exist, and we want don't want
      // to join box ticks pre-transition with whisker ticks post-.
      const whiskerTick = g.selectAll("text.whisker").data(whiskerData || []);

      whiskerTick
        .enter()
        .append("text")
        .attr("class", "whisker")
        .attr("dy", ".3em")
        .attr("dx", 6)
        .attr("x", width)
        .attr("y", x0)
        .text(format)
        .style("opacity", 1e-6)
        .transition()
        .duration(duration)
        .attr("y", x1)
        .style("opacity", 1);

      whiskerTick
        .transition()
        .duration(duration)
        .text(format)
        .attr("y", x1)
        .style("opacity", 1);

      whiskerTick
        .exit()
        .transition()
        .duration(duration)
        .attr("y", x1)
        .style("opacity", 1e-6)
        .remove();
    });
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'flush' does not exist on type '(callback... Remove this comment to see the full error message
    d3.timer.flush();
  }

  box.width = function(x: any) {
    if (!arguments.length) return width;
    width = x;
    return box;
  };

  box.height = function(x: any) {
    if (!arguments.length) return height;
    height = x;
    return box;
  };

  box.tickFormat = function(x: any) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return box;
  };

  box.duration = function(x: any) {
    if (!arguments.length) return duration;
    duration = x;
    return box;
  };

  box.domain = function(x: any) {
    if (!arguments.length) return domain;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'functor' does not exist on type 'typeof ... Remove this comment to see the full error message
    domain = x == null ? x : d3.functor(x);
    return box;
  };

  box.value = function(x: any) {
    if (!arguments.length) return value;
    value = x;
    return box;
  };

  box.whiskers = function(x: any) {
    if (!arguments.length) return whiskers;
    whiskers = x;
    return box;
  };

  box.quartiles = function(x: any) {
    if (!arguments.length) return quartiles;
    quartiles = x;
    return box;
  };

  return box;
}

function boxWhiskers(d: any) {
  return [0, d.length - 1];
}

function boxQuartiles(d: any) {
  return [d3.quantile(d, 0.25), d3.quantile(d, 0.5), d3.quantile(d, 0.75)];
}

export default box;
