'use strict';

(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
      var renderTemplate = '<marker-cluster-renderer></marker-cluster-renderer>';
      var editTemplate = '<markercluster-editor></markercluster-editor>';
      var defaultOptions = {

        general: {
          width: 100,
          height: 480,
          latColName: 'lat',
          lonColName: 'lon',
          descColName: 'msg',
        },

        leaflet: {
          keyboard: true,
          dragging: true,
          zoomControl: true,
          doubleClickZoom: true,
          scrollWheelZoom: false,
          tap: true,
          attributionControl: true,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
          worldCopyJump: true,
        },

        markercluster: {
          doubleClickZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          spiderfyOnMaxZoom: true,
          removeOutsideVisibleBounds: true,
          animate: true,
        }

      };
      VisualizationProvider.registerVisualization({
        type: 'MAP_MARKERCLUSTER',
        name: 'Map Marker Cluster',
        renderTemplate: renderTemplate,
        editorTemplate: editTemplate,
        defaultOptions: defaultOptions
      });

    }
  ]);

  module.directive('markerClusterRenderer', function() {

    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/markercluster.html',
      controller: ['$scope', 'growl', function ($scope, growl) {

        var baseLayers = {
          osm: {
              name: 'OpenStreetMap',
              type: 'xyz',
              url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          },
          osmbw: {
              name: 'OpenStreetMap BW',
              type: 'xyz',
              url: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png'
          },
          osmde: {
              name: 'OpenStreetMap DE',
              type: 'xyz',
              url: 'http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png'
          },
          stamentoner: {
              name: 'Stamen Toner',
              type: 'xyz',
              url: 'http://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'
          },
          stamentonerbg: {
              name: 'Stamen Toner Background',
              type: 'xyz',
              url: 'http://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png'
          },
          stamentonerlite: {
              name: 'Stamen Toner Lite',
              type: 'xyz',
              url: 'http://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png'
          },
        };

        var overlays = {
          markers: {
              name: "Markers",
              type: "markercluster",
              visible: true,
              layerOptions: {}
          }
        }

        angular.extend($scope, {
          layers: {
            baselayers: baseLayers,
            overlays: overlays
          },
          center: {
            autoDiscover: true,
            zoom: 6
          },
          events: {
            map: {
              enable: ['zoomstart', 'drag', 'click', 'mousemove'],
              logic: 'emit'
            }
          }
        });


        var reloadOptions = function(oldValues, newValues, scope){

          angular.extend($scope, {
            visualization: newValues,
            defaults: newValues.leaflet,
          });

          if (angular.isDefined($scope.layers.overlays.markers.layerOptions)){
            angular.extend($scope.layers.overlays.markers.layerOptions, newValues.markercluster);
          }

          if (angular.isDefined($scope.visualization.options)){
            if (angular.isDefined($scope.visualization.options.center)){
              angular.extend($scope.center, $scope.visualization.options.center);
            }
          }


        };


        var reloadData = function(oldValues, newValues, scope){

          if (!angular.isDefined($scope.defaults)){
            reloadOptions();
          }

          if (angular.isDefined($scope.queryResult) && $scope.queryResult.$resolved) {

            var data = $scope.queryResult.query_result.data.rows;

            // https://github.com/angular-ui/ui-leaflet/issues/19 # the 10k limit
            if (!data || data.length > 10000) {
              growl.addErrorMessage("Too much points to render. Change your query to retrieve max 10000 rows", {ttl: 6000});
              return;
            }

            if (angular.isDefined($scope.visualization)) {
              angular.extend($scope, {
                markers: data.map(function(ap) {
                  return {
                    layer: 'markers',
                    lat: ap[$scope.visualization.general.latColName],
                    lng: ap[$scope.visualization.general.lonColName],
                    message: ap[$scope.visualization.general.descColName]
                  };
                }),
              });
            }

          }

        };

        $scope.$watch('visualization.options', reloadOptions, true);
        $scope.$watch('queryResult && queryResult.getData()', reloadData);

      }]

    }
  });

  module.directive('markerclusterEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/markercluster_editor.html',
      controller: ['$scope', function($scope){

        var setVisualizationCenter = function(event, args){
          angular.extend($scope.$parent.visualization.options.leaflet, {
            center: args.model.lfCenter
          })
        };

        $scope.$on('leafletDirectiveMap.drag', setVisualizationCenter);
        $scope.$on('leafletDirectiveMap.click', setVisualizationCenter);

      }]
    }
  });

})();
