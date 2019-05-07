import d3 from 'd3';
import cloud from 'd3-cloud';
import { map, min, max, values } from 'lodash';
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

// target domain: [t1, t2]
const MIN_WORD_SIZE = 10;
const MAX_WORD_SIZE = 100;

function createScale(wordCounts) {
  wordCounts = values(wordCounts);

  // source domain: [s1, s2]
  const minCount = min(wordCounts);
  const maxCount = max(wordCounts);

  // Edge case - if all words have the same count; just set middle size for all
  if (minCount === maxCount) {
    return () => (MAX_WORD_SIZE + MIN_WORD_SIZE) / 2;
  }

  // v is value from source domain:
  //    s1 <= v <= s2.
  // We need to fit it target domain:
  //    t1 <= v" <= t2
  // 1. offset source value to zero point:
  //    v' = v - s1
  // 2. offset source and target domains to zero point:
  //    s' = s2 - s1
  //    t' = t2 - t1
  // 3. compute fraction:
  //    f = v' / s';
  //    0 <= f <= 1
  // 4. map f to target domain:
  //    v" = f * t' + t1;
  //    t1 <= v" <= t' + t1;
  //    t1 <= v" <= t2 (because t' = t2 - t1, so t2 = t' + t1)

  const sourceScale = maxCount - minCount;
  const targetScale = MAX_WORD_SIZE - MIN_WORD_SIZE;

  return value => ((value - minCount) / sourceScale) * targetScale + MIN_WORD_SIZE;
}

const WordCloudRenderer = {
  restrict: 'E',
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope, $element) {
    $element[0].style.display = 'block';

    const update = () => {
      const data = this.data.rows;
      const options = this.options;

      let wordsHash = {};
      if (options.column) {
        wordsHash = findWordFrequencies(data, options.column);
      }

      const scaleValue = createScale(wordsHash);

      const wordList = map(wordsHash, (count, key) => ({
        text: key,
        size: scaleValue(count),
      }));

      const fill = d3.scale.category20();
      const layout = cloud()
        .size([500, 500])
        .words(wordList)
        .padding(5)
        .rotate(() => Math.floor(Math.random() * 2) * 90)
        .font('Impact')
        .fontSize(d => d.size);

      function draw(words) {
        d3.select($element[0]).selectAll('*').remove();

        d3.select($element[0])
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
