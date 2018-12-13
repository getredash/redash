import React from 'react';
import PropTypes from 'prop-types';
import d3 from 'd3';
import cloud from 'd3-cloud';
import { each } from 'lodash';

import { QueryData } from '@/components/proptypes';

function findWordFrequencies(data, columnName) {
  const wordsHash = {};

  data.forEach((row) => {
    const wordsList = row[columnName].toString().split(' ');
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

const WordCloudOptions = PropTypes.shape({
  column: PropTypes.string,
});

export default class WordCloudRenderer extends React.Component {
  static Options = WordCloudOptions
  static DEFAULT_OPTIONS = Object.freeze({
    defaultRows: 8,
  })
  static propTypes = {
    data: QueryData.isRequired,
    options: WordCloudOptions.isRequired,
    listenForResize: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    props.listenForResize(() => this.draw());
  }

  componentDidMount() {
    this.draw();
  }

  componentDidUpdate() {
    this.draw();
  }

  draw = () => {
    const elem = this.containerRef.current;
    let wordsHash = {};

    if (this.props.options.column) {
      wordsHash = findWordFrequencies(this.props.data.rows, this.props.options.column);
    }

    const wordList = [];
    each(wordsHash, (v, key) => {
      wordList.push({ text: key, size: 10 + Math.pow(v, 2) });
    });

    const fill = d3.scale.category20();
    const layout = cloud()
      .size([500, 500])
      .words(wordList)
      .padding(5)
      .rotate(() => Math.floor(Math.random() * 2) * 90)
      .font('Impact')
      .fontSize(d => d.size);

    function draw(words) {
      d3.select(elem)
        .select('svg')
        .remove();

      d3.select(elem)
        .append('svg')
        .attr('width', layout.size()[0])
        .attr('height', layout.size()[1])
        .append('g')
        .attr('transform', `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Impact')
        .style('fill', (d, i) => fill(i))
        .attr('text-anchor', 'middle')
        .attr('transform', d =>
          `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text(d => d.text);
    }

    layout.on('end', draw);

    layout.start();
  }

  containerRef = React.createRef()

  render() {
    return <div className="sunburst-visualization-container" ref={this.containerRef} />;
  }
}
