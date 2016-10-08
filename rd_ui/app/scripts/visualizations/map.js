'use strict';

(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
    var renderTemplate =
      '<map-renderer ' +
      'options="visualization.options" query-result="queryResult">' +
      '</map-renderer>';

    var editTemplate = '<map-editor></map-editor>';
    var defaultOptions = {
      height: 500,
      classify: 'none',
      clusterMarkers: true
    };

    VisualizationProvider.registerVisualization({
      type: 'MAP',
      name: 'Map',
      renderTemplate: renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }
  ]);

  module.directive('mapRenderer', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/map.html',
      link: function($scope, elm, attrs) {
        $scope.$watch('queryResult && queryResult.getData()', render, true);
        $scope.$watch('visualization.options', render, true);
        angular.element(window).on("resize", resize);
        $scope.$watch('visualization.options.height', resize);

        var color = d3.scale.category10();
        var map = L.map(elm[0].children[0].children[0], {scrollWheelZoom: false});
        var mapControls = L.control.layers().addTo(map);
        var layers = {};
        var tileLayer = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('focus',function(){
          map.on('moveend', getBounds);
        });

        map.on('blur',function(){
          map.off('moveend', getBounds);
        });

        // Following line is used to avoid "Couldn't autodetect L.Icon.Default.imagePath" error
        // https://github.com/Leaflet/Leaflet/issues/766#issuecomment-7741039
        L.Icon.Default.imagePath = L.Icon.Default.imagePath || "//api.tiles.mapbox.com/mapbox.js/v2.2.1/images";


        function resize() {
          if (!map) return;
          map.invalidateSize(false);
          setBounds();
        }

        function setBounds (){
          var b = $scope.visualization.options.bounds;

          if(b){
            map.fitBounds([[b._southWest.lat, b._southWest.lng],[b._northEast.lat, b._northEast.lng]]);
          } else if (layers){
            var allMarkers = _.flatten(_.map(_.values(layers), function(l) { return l.getLayers() }));
            var group = new L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds());
          }
        };

        var createMarker = function(lat,lon){
          if (lat == null || lon == null) return;

          return L.marker([lat, lon]);
        };

        var heatpoint = function(lat, lon, color){
          if (lat == null || lon == null) return;

          var style = {
            fillColor:color,
            fillOpacity:0.9,
            stroke:false
          };

          return L.circleMarker([lat,lon],style)
        };

        function getBounds() {
          $scope.visualization.options.bounds = map.getBounds();
        }

        function createDescription(latCol, lonCol, row) {
          var lat = row[latCol];
          var lon = row[lonCol];

          var description = '<ul style="list-style-type: none;padding-left: 0">';
          description += "<li><strong>"+lat+ ", " + lon + "</strong>";

          for (var k in row){
            if (!(k == latCol || k == lonCol)) {
              description += "<li>" + k + ": " + row[k] + "</li>";
            }
          }

          return description;
        }

        function removeLayer(layer) {
          if (layer) {
            mapControls.removeLayer(layer);
            map.removeLayer(layer);
          }
        }

        function addLayer(name, points) {
          var latCol = $scope.visualization.options.latColName || 'lat';
          var lonCol = $scope.visualization.options.lonColName || 'lon';
          var classify = $scope.visualization.options.classify;

          var markers;
          if ($scope.visualization.options.clusterMarkers) {
            var color = $scope.visualization.options.groups[name].color;
            var options = {};

            if (classify) {
              options.iconCreateFunction = function (cluster) {
                var childCount = cluster.getChildCount();

                var c = ' marker-cluster-';
                if (childCount < 10) {
                  c += 'small';
                } else if (childCount < 100) {
                  c += 'medium';
                } else {
                  c += 'large';
                }

                c = '';


                var style = 'color: white; background-color: '+color+';';

                return L.divIcon({ html: '<div style="'+style+'"><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
              }
            }

            markers = L.markerClusterGroup(options);
          } else {
            markers = L.layerGroup();
          }

          // create markers
          _.each(points, function(row) {
            var marker;

            var lat = row[latCol];
            var lon = row[lonCol];

            if (classify && classify != 'none') {
              var color = $scope.visualization.options.groups[name].color;
              marker = heatpoint(lat, lon, color);
            } else {
              marker = createMarker(lat, lon);
            }

            if (!marker) return;

            marker.bindPopup(createDescription(latCol, lonCol, row));
            markers.addLayer(marker);
          });

          markers.addTo(map);

          layers[name] = markers;
          mapControls.addOverlay(markers, name);
        }

        function render() {
          var queryData = $scope.queryResult.getData();
          var classify = $scope.visualization.options.classify;

          $scope.visualization.options.mapTileUrl = $scope.visualization.options.mapTileUrl || '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

          tileLayer.setUrl($scope.visualization.options.mapTileUrl);

          if ($scope.visualization.options.clusterMarkers === undefined) {
            $scope.visualization.options.clusterMarkers = true;
          }

          if (queryData) {
            var pointGroups;
            if (classify && classify != 'none') {
              pointGroups = _.groupBy(queryData, classify);
            } else {
              pointGroups = {'All': queryData};
            }

            var groupNames = _.keys(pointGroups);
            var options = _.map(groupNames, function(group) {
              if ($scope.visualization.options.groups && $scope.visualization.options.groups[group]) {
                return $scope.visualization.options.groups[group];
              }
              return {color: color(group)};
            });

            $scope.visualization.options.groups = _.object(groupNames, options);

            _.each(layers, function(v, k) {
              removeLayer(v);
            });

            _.each(pointGroups, function(v, k) {
              addLayer(k, v);
            });

            setBounds();
          }
        }

      }
    }
  });

  module.directive('mapEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/map_editor.html',
      link: function($scope, elm, attrs) {
        $scope.currentTab = 'general';
        $scope.classify_columns = $scope.queryResult.columnNames.concat('none');
        $scope.mapTiles = [
          {
            name: 'OpenStreetMap',
            url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          },
          {
            name: 'OpenStreetMap BW',
            url: '//{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png'
          },
          {
            name: 'OpenStreetMap DE',
            url: '//{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png'
          },
          {
            name: 'OpenStreetMap FR',
            url: '//{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
          },
          {
            name: 'OpenStreetMap Hot',
            url: '//{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
          },
          {
            name: 'Thunderforest',
            url: '//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png'
          },
          {
            name: 'Thunderforest Spinal',
            url: '//{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png'
          },
          {
            name: 'OpenMapSurfer',
            url: '//korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}'
          },
          {
            name: 'Stamen Toner',
            url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'
          },
          {
            name: 'Stamen Toner Background',
            url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png'
          },
          {
            name: 'Stamen Toner Lite',
            url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png'
          },
          {
            name: 'OpenTopoMap',
            url: '//{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
          }
        ];
      }
    }
  });

})();
