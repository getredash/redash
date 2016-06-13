(function () {
  var wordCloudVisualization = angular.module('redash.visualization');

  wordCloudVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    VisualizationProvider.registerVisualization({
      type: 'WORD_CLOUD',
      name: 'Word Cloud',
      renderTemplate: '<word-cloud-renderer options="visualization.options" query-result="queryResult"></word-cloud-renderer>',
      editorTemplate: '<word-cloud-editor></word-cloud-editor>'
    });
  }]);

  wordCloudVisualization.directive('wordCloudRenderer', function () {
    return {
      restrict: 'E',
      link: function($scope, elem, attrs) {
       
        reloadCloud = function () {
          
          if (!angular.isDefined($scope.queryResult)) retun;
          data = $scope.queryResult.getData();
          cloud = d3.cloud; 
          
          wordsHash = {};
          if($scope.visualization.options.column){
          data.map(function(d) { 
                    d[$scope.visualization.options.column]
                      .toString()
                      .split(' ')
                      .map(function(d) {
                        if (d in wordsHash) {
                           wordsHash[d]+=1;
                        } else {
                           wordsHash[d]=1;
                        }
                     })
                   })
          } 
 
          wordList = [];
          for(var key in wordsHash) {
            wordList.push({text: key, size: 10 + Math.pow(wordsHash[key],2)});
          }
 
          var fill = d3.scale.category20();
          
          var layout = cloud()
              .size([500, 500])
              .words(wordList)
              .padding(5)
              .rotate(function() { return ~~(Math.random() * 2) * 90; })
              .font("Impact")
              .fontSize(function(d) { return d.size; })
              .on("end", draw);
          
          layout.start();
          
          function draw(words) {
            d3.select(elem[0].parentNode)
              .select("svg")
              .remove();

            d3.select(elem[0].parentNode)
              .append("svg")
                .attr("width", layout.size()[0])
                .attr("height", layout.size()[1])
              .append("g")
                .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
              .selectAll("text")
                .data(words)
              .enter().append("text")
                .style("font-size", function(d) { return d.size + "px"; })
                .style("font-family", "Impact")
                .style("fill", function(d, i) { return fill(i); })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                  return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; });
          }

        }

        $scope.$watch('queryResult && queryResult.getData()', reloadCloud);
        $scope.$watch('visualization.options.column', reloadCloud);
      }
    }
  });

  wordCloudVisualization.directive('wordCloudEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/word_cloud_editor.html'
    };
  });

})();
