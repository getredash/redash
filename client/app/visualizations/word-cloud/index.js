import d3 from 'd3';
import cloud from 'd3-cloud';
import { each } from 'lodash';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import Editor from './Editor';

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

const WordCloudRenderer = {
  restrict: 'E',
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope, $element) {
    const update = () => {
      const data = this.data.rows;
      const options = this.options;

      let wordsHash = {};
      if (options.column) {
        wordsHash = findWordFrequencies(data, options.column);
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
        d3.select($element[0].parentNode)
          .select('svg')
          .remove();

        d3.select($element[0].parentNode)
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
          .attr('transform', d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
          .text(d => d.text);
      }

      layout.on('end', draw);

      layout.start();
    };

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

export default function init(ngModule) {
  ngModule.component('wordCloudRenderer', WordCloudRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'WORD_CLOUD',
      name: 'Word Cloud',
      getOptions: options => ({ ...options }),
      Renderer: angular2react('wordCloudRenderer', WordCloudRenderer, $injector),
      Editor,

      defaultRows: 8,
    });
  });
}

init.init = true;
