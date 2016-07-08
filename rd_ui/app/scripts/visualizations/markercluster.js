'use strict';

(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
      var renderTemplate = '<marker-cluster-renderer ' +
      'query-result="queryResult" ' +
      '></marker-cluster-renderer>';

      var editTemplate = '<markercluster-editor></markercluster-editor>';
      var defaultOptions = {};

      VisualizationProvider.registerVisualization({
        type: 'MARKERCLUSTER',
        name: 'Marker Cluster',
        renderTemplate: renderTemplate,
        editorTemplate: editTemplate,
        defaultOptions: defaultOptions
      });

    }
  ]);

  module.directive('markerClusterRenderer', function() {
    return {
      restrict: 'E',
      scope: {
        queryResult: '=',
        options: '=?'
      },
      templateUrl: '/views/visualizations/markercluster.html',
      replace: false,
      controller: ['$scope', function ($scope) {




        angular.extend($scope, {
            center: {
                lat: -23.64361724010785,
                lng: -46.717244759202,
                zoom: 12
            },
            layers: {
                baselayers: {
                    osm: {
                        name: 'OpenStreetMap',
                        type: 'xyz',
                        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                },
                overlays: {
                    markers: {
                        name: "Markers",
                        type: "markercluster",
                        visible: true
                    }
                }

            }
        });


        function reloadData(data) {

          // https://github.com/angular-ui/ui-leaflet/issues/19 # the 10k limit
          if (!data || data.length > 6000) {
            return;
          }

          if (angular.isDefined($scope.queryResult)) {

            angular.extend($scope, {
              markers: data.map(function(ap) {
                return {
                  layer: 'markers',
                  lat: ap['lat'],
                  lng: ap['lng']
                };
              }),
            });
          }
        };

        $scope.$watch('queryResult && queryResult.getData()', reloadData);

      }]

    }
  });

  module.directive('markerclusterEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/markercluster_editor.html'
    }
  });

})();
