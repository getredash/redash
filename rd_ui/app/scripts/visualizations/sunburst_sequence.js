'use strict';

(function () {
  var module = angular.module('redash.visualization');

  module.directive('sunburstSequenceRenderer', function () {
    return {
      restrict: 'E',
      link: function(scope, element) {
        var sunburst = new Sunburst(scope, element);

        function resize() {
          sunburst.remove();
          sunburst = new Sunburst(scope, element);
        }

        angular.element(window).on("resize", resize);
        scope.$watch('visualization.options.height', function(oldValue, newValue) {
          if (oldValue !== newValue) {
            resize();
          }
        });
      }
    }
  });

  module.directive('sunburstSequenceEditor', function () {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/sunburst_sequence_editor.html'
    }
  });

  module.config(['VisualizationProvider', function (VisualizationProvider) {
    var renderTemplate =
      '<sunburst-sequence-renderer options="visualization.options" query-result="queryResult"></sunburst-sequence-renderer>';

    var editTemplate = '<sunburst-sequence-editor></sunburst-sequence-editor>';
    var defaultOptions = {
      height: 300,
      //
    };

    VisualizationProvider.registerVisualization({
      type: 'SUNBURST_SEQUENCE',
      name: 'Sunburst Sequence',
      renderTemplate: renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }
  ]);


  // The following is based on @chrisrzhou's example from: http://bl.ocks.org/chrisrzhou/d5bdd8546f64ca0e4366.
  function Sunburst(scope, element) {
    this.element = element;

    var refreshData = function () {
      var queryData = scope.queryResult.getData();
      if (queryData) {
        render(queryData);
      }
    };

    this.watches = [];
    this.watches.push(scope.$watch("visualization.options", refreshData, true));
    this.watches.push(scope.$watch("queryResult && queryResult.getData()", refreshData));

    /**
     * Dimensions of svg, sunburst, legend, breadcrumbs
     *
     */
    // svg dimensions
    var width = element[0].parentElement.clientWidth;
    var height = scope.visualization.options.height;
    var radius = Math.min(width, height) / 2;

    // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
    var b = {
      w: width / 6,
      h: 30,
      s: 3,
      t: 10
    };

    // Legend dimensions: width, height, spacing, radius of rounded rect.
    var li = {
      w: 75,
      h: 30,
      s: 3,
      r: 3
    };

    // margins
    var margin = {
      top: radius,
      bottom: 50,
      left: radius,
      right: 0
    };

    /**
     * Drawing variables:
     *
     * e.g. colors, totalSize, partitions, arcs
     */
    // Mapping of nodes to colorscale.
    var colors = d3.scale.category10();

    // Total size of all nodes, to be used later when data is loaded
    var totalSize = 0;

    // create d3.layout.partition
    var partition = d3.layout.partition()
      .size([2 * Math.PI, radius * radius])
      .value(function (d) {
        return d.size;
      });

    // create arcs for drawing D3 paths
    var arc = d3.svg.arc()
      .startAngle(function (d) {
        return d.x;
      })
      .endAngle(function (d) {
        return d.x + d.dx;
      })
      .innerRadius(function (d) {
        return Math.sqrt(d.y);
      })
      .outerRadius(function (d) {
        return Math.sqrt(d.y + d.dy);
      });


    /**
     * Define and initialize D3 select references and div-containers
     *
     * e.g. vis, breadcrumbs, lastCrumb, summary, sunburst, legend
     */
    // create main vis selection
    var vis = d3.select(element[0])
      .append("div").classed("vis-container", true)
      .style("position", "relative")
      .style("margin-top", "5px")
      .style("height", height + 2 * b.h + "px");

    // create and position breadcrumbs container and svg
    var breadcrumbs = vis
      .append("div").classed("breadcrumbs-container", true)
      .append("svg")
      .attr("width", width)
      .attr("height", b.h)
      .attr("fill", "white")
      .attr("font-weight", 600);

    var marginLeft = (width - radius * 2) / 2;

    // create and position SVG
    var sunburst = vis
      .append("div").classed("sunburst-container", true)
      .style('z-index', '2')
      // .style("margin-left", marginLeft + "px")
      .style("left", marginLeft + "px")
      .style('position', 'absolute')
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // create last breadcrumb element
    var lastCrumb = breadcrumbs.append("text").classed("lastCrumb", true);

    // create and position summary container
    var summary = vis
      .append("div").classed("summary-container", true)
      .style("position", "absolute")
      .style("top", b.h + radius * 0.80 + "px")
      .style("left", marginLeft + radius / 2 + "px")
      .style("width", radius + "px")
      .style("height", radius + "px")
      .style("text-align", "center")
      .style("font-size", "11px")
      .style("color", "#666")
      .style('z-index', '1');

    refreshData();

    /**
     * Render process:
     *
     * 1) Load data
     * 2) Build Tree
     * 3) Draw visualization
     */
    // render visualization
    function render(data) {
      var json = buildHierarchy(data); // build json tree
      removeVisualization(); // remove existing visualization if any
      createVisualization(json); // visualize json tree
    }


    /**
     * Helper functions:
     *
     * @function removeVisualization(): removes existing SVG components
     * @function createVisualization(json): create visualization from json tree structure
     * @function colorMap(d): color nodes with colors mapping
     * @function mouseover(d): mouseover function
     * @function mouseleave(d): mouseleave function
     * @function getAncestors(node): get ancestors of a specified node
     * @function buildHierarchy(data): generate json nested structure from csv data input
     */
    // removes existing SVG components
    function removeVisualization() {
      sunburst.selectAll(".nodePath").remove();
      // legend.selectAll("g").remove();
    }


    // visualize json tree structure
    function createVisualization(json) {
      drawSunburst(json); // draw sunburst
      // drawLegend(); // draw legend
    };

    // helper function colorMap - color gray if "end" is detected
    function colorMap(d) {
      return colors(d.name);
    }


    // helper function to draw the sunburst and breadcrumbs
    function drawSunburst(json) {
      // Build only nodes of a threshold "visible" sizes to improve efficiency
      var nodes = partition.nodes(json)
        .filter(function (d) {
          return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
        });

      // this section is required to update the colors.domain() every time the data updates
      var uniqueNames = (function (a) {
        var output = [];
        a.forEach(function (d) {
          if (output.indexOf(d.name) === -1) output.push(d.name);
        });
        return output;
      })(nodes);
      colors.domain(uniqueNames); // update domain colors

      // create path based on nodes
      var path = sunburst.data([json]).selectAll("path")
        .data(nodes).enter()
        .append("path").classed("nodePath", true)
        .attr("display", function (d) {
          return d.depth ? null : "none";
        })
        .attr("d", arc)
        .attr("fill", colorMap)
        .attr("opacity", 1)
        .attr("stroke", "white")
        .on("mouseover", mouseover);


      // // trigger mouse click over sunburst to reset visualization summary
      vis.on("click", click);

      // Update totalSize of the tree = value of root node from partition.
      totalSize = path.node().__data__.value;
    }

    // helper function mouseover to handle mouseover events/animations and calculation of ancestor nodes etc
    function mouseover(d) {
      // build percentage string
      var percentage = (100 * d.value / totalSize).toPrecision(3);
      var percentageString = percentage + "%";
      if (percentage < 1) {
        percentageString = "< 1.0%";
      }

      // update breadcrumbs (get all ancestors)
      var ancestors = getAncestors(d);
      updateBreadcrumbs(ancestors, percentageString);

      // update sunburst (Fade all the segments and highlight only ancestors of current segment)
      sunburst.selectAll("path")
        .attr("opacity", 0.3);
      sunburst.selectAll("path")
        .filter(function (node) {
          return (ancestors.indexOf(node) >= 0);
        })
        .attr("opacity", 1);

      // update summary
      summary.html(
        "Stage: " + d.depth + "<br />" +
        "<span class='percentage' style='font-size: 2em;'>" + percentageString + "</span><br />" +
        d.value + " of " + totalSize + "<br />"
      );

      // display summary and breadcrumbs if hidden
      summary.style("visibility", "");
      breadcrumbs.style("visibility", "");
    }


    // helper function click to handle mouseleave events/animations
    function click(d) {
      // Deactivate all segments then retransition each segment to full opacity.
      sunburst.selectAll("path").on("mouseover", null);
      sunburst.selectAll("path")
        .transition()
        .duration(1000)
        .attr("opacity", 1)
        .each("end", function () {
          d3.select(this).on("mouseover", mouseover);
        });

      // hide summary and breadcrumbs if visible
      breadcrumbs.style("visibility", "hidden");
      summary.style("visibility", "hidden");
    }


    // Return array of ancestors of nodes, highest first, but excluding the root.
    function getAncestors(node) {
      var path = [];
      var current = node;

      while (current.parent) {
        path.unshift(current);
        current = current.parent;
      }
      return path;
    }


    // Generate a string representation for drawing a breadcrumb polygon.
    function breadcrumbPoints(d, i) {
      var points = [];
      points.push("0,0");
      points.push(b.w + ",0");
      points.push(b.w + b.t + "," + (b.h / 2));
      points.push(b.w + "," + b.h);
      points.push("0," + b.h);

      if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
      }
      return points.join(" ");
    }


    // Update the breadcrumb breadcrumbs to show the current sequence and percentage.
    function updateBreadcrumbs(ancestors, percentageString) {
      // Data join, where primary key = name + depth.
      var g = breadcrumbs.selectAll("g")
        .data(ancestors, function (d) {
          return d.name + d.depth;
        });

      // Add breadcrumb and label for entering nodes.
      var breadcrumb = g.enter().append("g");

      breadcrumb
        .append("polygon").classed("breadcrumbs-shape", true)
        .attr("points", breadcrumbPoints)
        .attr("fill", colorMap);

      breadcrumb
        .append("text").classed("breadcrumbs-text", true)
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(function (d) {
          return d.name;
        });

      // Set position for entering and updating nodes.
      g.attr("transform", function (d, i) {
        return "translate(" + i * (b.w + b.s) + ", 0)";
      });

      // Remove exiting nodes.
      g.exit().remove();

      // Update percentage at the lastCrumb.
      lastCrumb
        .attr("x", (ancestors.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .attr("font-weight", 600)
        .text(percentageString);
    }

    function buildHierarchy(csv) {
      var data = buildNodes(csv);

      // build tree
      var root = {
        name: "root",
        children: []
      };

      data.forEach(function (d) {
        var nodes = d.nodes;
        var size = parseInt(d.size);

        // build graph, nodes, and child nodes
        var currentNode = root;
        for (var j = 0; j < nodes.length; j++) {
          var children = currentNode.children;
          var nodeName = nodes[j];
          var childNode;

          if (j + 1 < nodes.length) {
            // Not yet at the end of the sequence; move down the tree.
            var foundChild = false;
            for (var k = 0; k < children.length; k++) {
              if (children[k].name == nodeName) {
                childNode = children[k];
                foundChild = true;
                break;
              }
            }
            if (!foundChild) { // If we don't already have a child node for this branch, create it.
              childNode = {
                name: nodeName,
                children: []
              };
              children.push(childNode);
            }
            currentNode = childNode;
          } else { // Reached the end of the sequence; create a leaf node.
            childNode = {
              name: nodeName,
              size: size,
            };
            children.push(childNode);
          }
        }
      });

      return root;
    }

    function buildNodes(raw) {
      var grouped = _.groupBy(raw, 'sequence');

      var values = _.map(grouped, function(value, key) {
        var sorted = _.sortBy(value, 'stage');
        return {
          size: value[0].value,
          nodes: _.pluck(sorted, 'node')
        }
      });

      return values;
    }
  }

  Sunburst.prototype.remove = function() {
    _.each(this.watches, function(unregister) { unregister() });
    angular.element(this.element[0]).empty('.vis-container');
  }


})();
