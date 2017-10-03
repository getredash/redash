import d3 from 'd3';
import angular from 'angular';
import cloud from 'd3-cloud';
import { each } from 'underscore';

import editorTemplate from './word-cloud-editor.html';

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


function wordCloudRenderer() {
  return {
    restrict: 'E',
    link($scope, elem) {
      function reloadCloud() {
        if (!angular.isDefined($scope.queryResult)) return;

        const data = $scope.queryResult.getData();
        let wordsHash = {};

        if ($scope.visualization.options.column) {
          wordsHash = findWordFrequencies(data, $scope.visualization.options.column);
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
          d3.select(elem[0].parentNode)
            .select('svg')
            .remove();

          d3.select(elem[0].parentNode)
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

      $scope.$watch('queryResult && queryResult.getData()', reloadCloud);
      $scope.$watch('visualization.options.column', reloadCloud);
    },
  };
}

function wordCloudEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
  };
}

export default function init(ngModule) {
  ngModule.directive('wordCloudEditor', wordCloudEditor);
  ngModule.directive('wordCloudRenderer', wordCloudRenderer);

  ngModule.config((VisualizationProvider) => {
    VisualizationProvider.registerVisualization({
      type: 'WORD_CLOUD',
      name: 'Word Cloud',
      renderTemplate: '<word-cloud-renderer options="visualization.options" query-result="queryResult"></word-cloud-renderer>',
      editorTemplate: '<word-cloud-editor></word-cloud-editor>',
    });
  });
}
