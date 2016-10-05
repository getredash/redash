(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
      var renderTemplate =
        '<boxplot-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</boxplot-renderer>';

      var editTemplate = '<boxplot-editor></boxplot-editor>';

      VisualizationProvider.registerVisualization({
        type: 'BOXPLOT',
        name: 'Boxplot',
        renderTemplate: renderTemplate,
        editorTemplate: editTemplate
      });
    }
  ]);
  module.directive('boxplotRenderer', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/boxplot.html',
      link: function($scope, elm, attrs) {

        function iqr(k) {
          return function(d, i) {
            var q1 = d.quartiles[0],
                q3 = d.quartiles[2],
                iqr = (q3 - q1) * k,
                i = -1,
                j = d.length;
            while (d[++i] < q1 - iqr);
            while (d[--j] > q3 + iqr);
            return [i, j];
          };
        };

        $scope.$watch('[queryResult && queryResult.getData(), visualization.options]', function () {
          if ($scope.queryResult.getData() === null) {
            return;
          }

          var data = $scope.queryResult.getData();
          var parentWidth = d3.select(elm[0].parentNode).node().getBoundingClientRect().width;
          var margin = {top: 10, right: 50, bottom: 40, left: 50, inner: 25},
              width = parentWidth - margin.right - margin.left
              height = 500 - margin.top - margin.bottom;

          var min = Infinity,
              max = -Infinity;
          var mydata = [];
          var value = 0;
          var d = [];
          var xAxisLabel = $scope.visualization.options.xAxisLabel;
          var yAxisLabel = $scope.visualization.options.yAxisLabel;

          var columns = $scope.queryResult.getColumnNames();
          var xscale = d3.scale.ordinal()
            .domain(columns)
            .rangeBands([0, parentWidth-margin.left-margin.right]);

          if (columns.length > 1){
            boxWidth = Math.min(xscale(columns[1]),120.0);
          } else {
            boxWidth=120.0;
          };
          margin.inner = boxWidth/3.0;

          _.each(columns, function(column, i){
            d = mydata[i] = [];
            _.each(data, function (row) {
              value = row[column];
              d.push(value);
              if (value > max) max = Math.ceil(value);
              if (value < min) min = Math.floor(value);
            });
          });

          var yscale = d3.scale.linear()
            .domain([min*0.99,max*1.01])
            .range([height, 0]);

          var chart = d3.box()
              .whiskers(iqr(1.5))
              .width(boxWidth-2*margin.inner)
              .height(height)
              .domain([min*0.99,max*1.01]);
          var xAxis = d3.svg.axis()
            .scale(xscale)
            .orient("bottom");


          var yAxis = d3.svg.axis()
            .scale(yscale)
            .orient("left");

          var xLines = d3.svg.axis()
            .scale(xscale)
            .tickSize(height)
            .orient("bottom");

          var yLines = d3.svg.axis()
            .scale(yscale)
            .tickSize(width)
            .orient("right");

          var barOffset = function(i){
            return xscale(columns[i]) + (xscale(columns[1]) - margin.inner)/2.0;
          };

          d3.select(elm[0]).selectAll("svg").remove();

          var plot = d3.select(elm[0])
            .append("svg")
              .attr("width",parentWidth)
              .attr("height",height + margin.bottom + margin.top)
            .append("g")
              .attr("width",parentWidth-margin.left-margin.right)
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

          d3.select("svg").append("text")
              .attr("class", "box")
              .attr("x", parentWidth/2.0)
              .attr("text-anchor", "middle")
              .attr("y", height+margin.bottom)
              .text(xAxisLabel)

          d3.select("svg").append("text")
              .attr("class", "box")
              .attr("transform","translate(10,"+(height+margin.top+margin.bottom)/2.0+")rotate(-90)")
              .attr("text-anchor", "middle")
              .text(yAxisLabel)

          plot.append("rect")
              .attr("class", "grid-background")
              .attr("width", width)
              .attr("height", height);

          plot.append("g")
              .attr("class","grid")
              .call(yLines)

          plot.append("g")
              .attr("class","grid")
              .call(xLines)

          plot.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis);

          plot.append("g")
              .attr("class", "y axis")
              .call(yAxis);

          plot.selectAll(".box").data(mydata)
            .enter().append("g")
              .attr("class", "box")
              .attr("width", boxWidth)
              .attr("height", height)
              .attr("transform", function(d,i) { return "translate(" + barOffset(i) + "," + 0 + ")"; } )
              .call(chart);
        }, true);
      }
    }
  });

  module.directive('boxplotEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/boxplot_editor.html'
    };
  });

})();
