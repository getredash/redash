(function() {
  'use strict';

  var module = angular.module('redash.visualization');

  module.directive('sankeyRenderer', function() {
    return {
      restrict: 'E',
      link: function(scope, element) {
        var refreshData = function() {
          var queryData = scope.queryResult.getData();
          if (queryData) {
            // do the render logic.
            angular.element(element[0]).empty();
            createSankey(element[0], scope.visualization.options.height, queryData);
          }
        };

        angular.element(window).on("resize", refreshData);
        scope.$watch("queryResult && queryResult.getData()", refreshData);
        scope.$watch('visualization.options.height', function(oldValue, newValue) {
          if (oldValue !== newValue) {
            refreshData();
          }
        });
      }
    }
  });

  module.directive('sankeyEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/sankey_editor.html'
    }
  });

  module.config(['VisualizationProvider', function(VisualizationProvider) {
      var renderTemplate =
        '<sankey-renderer options="visualization.options" query-result="queryResult"></sankey-renderer>';

      var editTemplate = '<sankey-editor></sankey-editor>';
      var defaultOptions = {
        height: 300
      };

      VisualizationProvider.registerVisualization({
        type: 'SANKEY',
        name: 'Sankey',
        renderTemplate: renderTemplate,
        editorTemplate: editTemplate,
        defaultOptions: defaultOptions
      });
    }
  ]);

  function createSankey(element, height, data) {
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = $(element).parent().width() - margin.left - margin.right,
    height = height - margin.top - margin.bottom;

    data = graph(data);

    var formatNumber = d3.format(",.0f");    // zero decimal places
    var format = function(d) { return formatNumber(d); };
    var color = d3.scale.category20();

    // append the svg canvas to the page
    var svg = d3.select(element).append("svg")
      .attr("class", "sankey")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

    // Set the sankey diagram properties
    var sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .size([width, height]);

    var path = sankey.link();

    sankey
      .nodes(data.nodes)
      .links(data.links)
      .layout(0);

    spreadNodes(height, data);
    sankey.relayout();

    // add in the links
    var link = svg.append("g").selectAll(".link")
      .data(data.links)
      .enter().append("path")
      .filter(function(link) {
        return link.target.name != 'Exit';
      })
      .attr("class", "link")
      .attr("d", path)
      .style("stroke-width", function(d) { return Math.max(1, d.dy); })
      .sort(function(a, b) { return b.dy - a.dy; });

    // add the link titles
    link.append("title")
      .text(function(d) {
        return d.source.name + " → " + d.target.name + "\n" + format(d.value);
      });

    // add in the nodes
    var node = svg.append("g").selectAll(".node")
      .data(data.nodes)
      .enter().append("g")
      .filter(function(node) {
        return node.name != 'Exit';
      })
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      })
      .on("mouseover", nodeMouseOver)
      .on("mouseout", nodeMouseOut);

    // add the rectangles for the nodes
    node.append("rect")
      .attr("height", function(d) { return d.dy; })
      .attr("width", sankey.nodeWidth())
      .style("fill", function(d) {
        return d.color = color(d.name.replace(/ .*/, ""));
      })
      .style("stroke", function(d) {
        return d3.rgb(d.color).darker(2);
      })
      .append("title").text(function(d) {
        return d.name + "\n" + format(d.value);
      });

    // add in the title for the nodes
    node.append("text")
      .attr("x", -6)
      .attr("y", function(d) { return d.dy / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      .text(function(d) { return d.name; })
      .filter(function(d) { return d.x < width / 2; })
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");

    function nodeMouseOver(currentNode) {
      var nodes = getConnectedNodes(currentNode);
      nodes = _.pluck(nodes, 'id');
      node.filter(function(d) {
        if (d === currentNode) {
          return false;
        }

        if (_.contains(nodes, d.id)) {
          return false;
        }

        return true;
      }).style('opacity', 0.2);
      link.filter(function(l) {
        return !(_.include(currentNode.sourceLinks, l) || _.include(currentNode.targetLinks, l));
      }).style('opacity', 0.2);
    }

    function nodeMouseOut(currentNode) {
      node.style('opacity', 1);
      link.style('opacity', 1);
    }

    function spreadNodes(height, data) {
      var nodesByBreadth = d3.nest()
        .key(function(d) { return d.x; })
        .entries(data.nodes)
        .map(function(d) { return d.values; });

      nodesByBreadth.forEach(function(nodes) {
        nodes = _.filter(_.sortBy(nodes, function(node) { return -node.value; }), function(node) {
          return node.name !== 'Exit';
        });

        var sum = d3.sum(nodes, function(o) { return o.dy; });
        var padding = (height - sum) / nodes.length;

        _.reduce(nodes, function(y0, node) {
          node.y = y0;
          return y0 + node.dy + padding;
        }, 0);
      });
    }

    function getConnectedNodes(node) {
      // source link = this node is the source, I need the targets
      var nodes = [];
      _.each(node.sourceLinks, function(link) {
        nodes.push(link.target);
      });
      _.each(node.targetLinks, function(link) {
        nodes.push(link.source);
      });

      return nodes;
    }

    function graph(data) {
      var nodesDict = {};
      var links = {};
      var nodes = [];

      var keys = _.sortBy(_.without(_.keys(data[0]), 'value'), _.identity);

      data.forEach(function(row) {
        addLink(row[keys[0]], row[keys[1]], row.value, 1);
        addLink(row[keys[1]], row[keys[2]], row.value, 2);
        addLink(row[keys[2]], row[keys[3]], row.value, 3);
        addLink(row[keys[3]], row[keys[4]], row.value, 4);
      });

      return {nodes: nodes, links: _.values(links)};

      function normalizeName(name) {
        if (name) {
          return name;
        }

        return 'Exit';
      }

      function getNode(name, level) {
        name = normalizeName(name);
        var key = name + ":" + String(level);
        var node = nodesDict[key];
        if (!node) {
          node = {name: name};
          var id = nodes.push(node) - 1;
          node.id = id;
          nodesDict[key] = node;
        }
        return node;
      }

      function getLink(source, target) {
        var link = links[[source, target]];
        if (!link) {
          link = {target: target, source: source, value: 0};
          links[[source, target]] = link;
        }

        return link;
      }

      function addLink(sourceName, targetName, value, depth) {
        if ((sourceName === '' || !sourceName) && depth > 1) {
          return;
        }

        var source = getNode(sourceName, depth);
        var target = getNode(targetName, depth+1);
        var link = getLink(source.id, target.id);
        link.value += parseInt(value);
      }
    }
  }

})();
