import d3 from 'd3';
import cloud from 'd3-cloud';
import { each, map, min, max, values, sortBy } from 'lodash';
import React, { useMemo, useState, useEffect } from 'react';
import resizeObserver from '@/services/resizeObserver';
import { RendererPropTypes } from '@/visualizations';

import './renderer.less';

function computeWordFrequencies(rows, column) {
  const result = {};

  each(rows, (row) => {
    const wordsList = row[column].toString().split(/\s/g);
    each(wordsList, (d) => {
      result[d] = (result[d] || 0) + 1;
    });
  });

  return result;
}

function getWordsWithFrequencies(rows, wordColumn, frequencyColumn) {
  const result = {};

  each(rows, (row) => {
    const count = parseFloat(row[frequencyColumn]);
    if (Number.isFinite(count) && (count > 0)) {
      const word = row[wordColumn];
      result[word] = count;
    }
  });

  return result;
}

function applyLimitsToWords(wordsHash, { wordLength, wordCount }) {
  const result = {};

  wordLength.min = Number.isFinite(wordLength.min) ? wordLength.min : null;
  wordLength.max = Number.isFinite(wordLength.max) ? wordLength.max : null;
  if (wordLength.min && wordLength.max && (wordLength.min > wordLength.max)) {
    wordLength = { min: wordLength.max, max: wordLength.min }; // swap
  }

  wordCount.min = Number.isFinite(wordCount.min) ? wordCount.min : null;
  wordCount.max = Number.isFinite(wordCount.max) ? wordCount.max : null;
  if (wordCount.min && wordCount.max && (wordCount.min > wordCount.max)) {
    wordCount = { min: wordCount.max, max: wordCount.min }; // swap
  }

  each(wordsHash, (count, word) => {
    if (wordLength.min && (word.length < wordLength.min)) {
      return;
    }
    if (wordLength.max && (word.length > wordLength.max)) {
      return;
    }
    if (wordCount.min && (count < wordCount.min)) {
      return;
    }
    if (wordCount.max && (count > wordCount.max)) {
      return;
    }
    result[word] = count;
  });

  return result;
}

function prepareWords(rows, options) {
  let result = [];

  if (options.column) {
    if (options.frequenciesColumn) {
      result = getWordsWithFrequencies(rows, options.column, options.frequenciesColumn);
    } else {
      result = computeWordFrequencies(rows, options.column);
    }
  }

  result = applyLimitsToWords(result, {
    wordLength: options.wordLengthLimit,
    wordCount: options.wordCountLimit,
  });

  const counts = values(result);
  const wordSize = d3.scale.linear()
    .domain([min(counts), max(counts)])
    .range([10, 100]); // min/max word size

  const color = d3.scale.category20();

  result = map(result, (count, key) => ({
    text: key,
    size: wordSize(count),
  }));

  // add some attributes
  result = map(result, (word, i) => ({
    ...word,
    color: color(i),
    angle: i % 2 * 90, // make it stable between renderings
  }));

  return sortBy(
    result,
    [({ size }) => -size, ({ text }) => -text.length], // "size" desc, length("text") desc
  );
}

function scaleElement(node, container) {
  node.style.transform = null;
  const { width: nodeWidth, height: nodeHeight } = node.getBoundingClientRect();
  const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

  const scaleX = containerWidth / nodeWidth;
  const scaleY = containerHeight / nodeHeight;

  node.style.transform = `scale(${Math.min(scaleX, scaleY)})`;
}

function createLayout() {
  return cloud()
    // make the area large enough to contain even very long words; word cloud will be placed in the center of the area
    // TODO: dimensions probably should be larger, but `d3-cloud` has some performance issues related to these values
    .size([5000, 5000])
    .padding(3)
    .font('Impact')
    .rotate(d => d.angle)
    .fontSize(d => d.size)
    .random(() => 0.5); // do not place words randomly - use compact layout
}

function render(container, words) {
  container = d3.select(container);
  container.selectAll('*').remove();

  const svg = container.append('svg');
  const g = svg.append('g');
  g.selectAll('text')
    .data(words)
    .enter()
    .append('text')
    .style('font-size', d => `${d.size}px`)
    .style('font-family', d => d.font)
    .style('fill', d => d.color)
    .attr('text-anchor', 'middle')
    .attr('transform', d => `translate(${[d.x, d.y]}) rotate(${d.rotate})`)
    .text(d => d.text);

  const svgBounds = svg.node().getBoundingClientRect();
  const gBounds = g.node().getBoundingClientRect();

  svg.attr('width', Math.ceil(gBounds.width)).attr('height', Math.ceil(gBounds.height));
  g.attr('transform', `translate(${svgBounds.left - gBounds.left},${svgBounds.top - gBounds.top})`);

  scaleElement(svg.node(), container.node());
}

export default function Renderer({ data, options }) {
  const [container, setContainer] = useState(null);
  const [words, setWords] = useState([]);
  const layout = useMemo(createLayout, []);

  useEffect(() => {
    layout.words(prepareWords(data.rows, options)).on('end', w => setWords(w)).start();
    return () => layout.on('end', null).stop();
  }, [layout, data, options, setWords]);

  useEffect(() => {
    if (container) {
      render(container, words);
    }
  }, [container, words]);

  useEffect(() => resizeObserver(container, () => {
    const svg = container.querySelector('svg');
    if (svg) {
      scaleElement(svg, container);
    }
  }), [container]);

  return (<div className="word-cloud-visualization-container" ref={setContainer} />);
}

Renderer.propTypes = RendererPropTypes;
