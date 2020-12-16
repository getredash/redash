import d3 from "d3";
import cloud from "d3-cloud";
import { each, filter, map, min, max, sortBy, toString } from "lodash";
import React, { useMemo, useState, useEffect } from "react";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations/prop-types";

import "./renderer.less";

function computeWordFrequencies(rows: any, column: any) {
  const result = {};

  each(rows, row => {
    const wordsList = toString(row[column]).split(/\s/g);
    each(wordsList, d => {
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      result[d] = (result[d] || 0) + 1;
    });
  });

  return result;
}

function getWordsWithFrequencies(rows: any, wordColumn: any, frequencyColumn: any) {
  const result = {};

  each(rows, row => {
    const count = parseFloat(row[frequencyColumn]);
    if (Number.isFinite(count) && count > 0) {
      const word = toString(row[wordColumn]);
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      result[word] = count;
    }
  });

  return result;
}

function applyLimitsToWords(words: any, {
  wordLength,
  wordCount
}: any) {
  wordLength.min = Number.isFinite(wordLength.min) ? wordLength.min : null;
  wordLength.max = Number.isFinite(wordLength.max) ? wordLength.max : null;

  wordCount.min = Number.isFinite(wordCount.min) ? wordCount.min : null;
  wordCount.max = Number.isFinite(wordCount.max) ? wordCount.max : null;

  return filter(words, ({ text, count }) => {
    const wordLengthFits =
      (!wordLength.min || text.length >= wordLength.min) && (!wordLength.max || text.length <= wordLength.max);
    const wordCountFits = (!wordCount.min || count >= wordCount.min) && (!wordCount.max || count <= wordCount.max);
    return wordLengthFits && wordCountFits;
  });
}

function prepareWords(rows: any, options: any) {
  let result: any = [];

  if (options.column) {
    if (options.frequenciesColumn) {
      result = getWordsWithFrequencies(rows, options.column, options.frequenciesColumn);
    } else {
      result = computeWordFrequencies(rows, options.column);
    }
    result = sortBy(
      map(result, (count, text) => ({ text, count })),
      [({ count }) => -count, ({ text }) => -text.length] // "count" desc, length("text") desc
    );
  }

  // Add additional attributes
  const counts = map(result, item => item.count);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'scale' does not exist on type 'typeof im... Remove this comment to see the full error message
  const wordSize = d3.scale
    .linear()
    .domain([min(counts), max(counts)])
    .range([10, 100]); // min/max word size
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'scale' does not exist on type 'typeof im... Remove this comment to see the full error message
  const color = d3.scale.category20();

  each(result, (item, index) => {
    item.size = wordSize(item.count);
    item.color = color(index);
    // @ts-expect-error ts-migrate(2362) FIXME: The left-hand side of an arithmetic operation must... Remove this comment to see the full error message
    item.angle = (index % 2) * 90; // make it stable between renderings
  });

  return applyLimitsToWords(result, {
    wordLength: options.wordLengthLimit,
    wordCount: options.wordCountLimit,
  });
}

function scaleElement(node: any, container: any) {
  node.style.transform = null;
  const { width: nodeWidth, height: nodeHeight } = node.getBoundingClientRect();
  const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

  const scaleX = containerWidth / nodeWidth;
  const scaleY = containerHeight / nodeHeight;

  node.style.transform = `scale(${Math.min(scaleX, scaleY)})`;
}

function createLayout() {
  const fontFamily = window.getComputedStyle(document.body).fontFamily;

  return (
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    cloud()
      // make the area large enough to contain even very long words; word cloud will be placed in the center of the area
      // TODO: dimensions probably should be larger, but `d3-cloud` has some performance issues related to these values
      .size([5000, 5000])
      .padding(3)
      .font(fontFamily)
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'angle' does not exist on type 'Word'.
      .rotate(d => d.angle)
      .fontSize(d => d.size)
      .random(() => 0.5)
  ); // do not place words randomly - use compact layout
}

function render(container: any, words: any) {
  container = d3.select(container);
  container.selectAll("*").remove();

  const svg = container.append("svg");
  const g = svg.append("g");
  g.selectAll("text")
    .data(words)
    .enter()
    .append("text")
    .style("font-size", (d: any) => `${d.size}px`)
    .style("font-family", (d: any) => d.font)
    .style("fill", (d: any) => d.color)
    .attr("text-anchor", "middle")
    .attr("transform", (d: any) => `translate(${[d.x, d.y]}) rotate(${d.rotate})`)
    .text((d: any) => d.text);

  const svgBounds = svg.node().getBoundingClientRect();
  const gBounds = g.node().getBoundingClientRect();

  svg.attr("width", Math.ceil(gBounds.width)).attr("height", Math.ceil(gBounds.height));
  g.attr("transform", `translate(${svgBounds.left - gBounds.left},${svgBounds.top - gBounds.top})`);

  scaleElement(svg.node(), container.node());
}

export default function Renderer({
  data,
  options
}: any) {
  const [container, setContainer] = useState(null);
  const [words, setWords] = useState([]);
  const layout = useMemo(createLayout, []);

  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '() => () => layout.Cloud<cloud.W... Remove this comment to see the full error message
  useEffect(() => {
    layout
      .words(prepareWords(data.rows, options))
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Word[]' is not assignable to par... Remove this comment to see the full error message
      .on("end", w => setWords(w))
      .start();
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    return () => layout.on("end", null).stop();
  }, [layout, data, options, setWords]);

  useEffect(() => {
    if (container) {
      render(container, words);
    }
  }, [container, words]);

  useEffect(() => {
    if (container) {
      const unwatch = resizeObserver(container, () => {
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        const svg = container.querySelector("svg");
        if (svg) {
          scaleElement(svg, container);
        }
      });
      return unwatch;
    }
  }, [container]);

  // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
  return <div className="word-cloud-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
