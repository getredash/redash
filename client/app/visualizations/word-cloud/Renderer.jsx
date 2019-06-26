import d3 from 'd3';
import cloud from 'd3-cloud';
import { map, min, max, values, sortBy } from 'lodash';
import React, { useMemo, useState, useEffect } from 'react';
import { RendererPropTypes } from '@/visualizations';

function computeWordFrequencies(rows, column) {
  const wordsHash = {};

  rows.forEach((row) => {
    const wordsList = row[column].toString().split(' ');
    wordsList.forEach((d) => {
      if (d in wordsHash) {
        wordsHash[d] += 1;
      } else {
        wordsHash[d] = 1;
      }
    });
  });

  return wordsHash;
}

function prepareWords(rows, options) {
  let result = [];

  if (options.column) {
    result = computeWordFrequencies(rows, options.column);
  }

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
  node.style.transformOrigin = 'left top';
}

function createLayout() {
  return cloud()
  // make the area large enough to contain even very long words; word cloud will be placed in the center of the area
    .size([10000, 10000])
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

  // get real bounds of words and add some padding to ensure that everything is visible
  const bounds = g.node().getBoundingClientRect();
  const width = bounds.width + 10;
  const height = bounds.height + 10;

  svg.attr('width', width).attr('height', height);
  g.attr('transform', `translate(${width / 2},${height / 2})`);

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

  return (<div className="word-cloud-visualization-container" ref={setContainer} />);
}

Renderer.propTypes = RendererPropTypes;
