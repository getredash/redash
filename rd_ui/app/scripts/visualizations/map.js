(function () {
  var mapVisualization = angular.module('redash.visualization');

  mapVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    VisualizationProvider.registerVisualization({
      type: 'MAP',
      name: 'Map',
      renderTemplate: '<map-renderer class="col-lg-12" query-result="queryResult"></map-renderer>'
    });
  }]);

  mapVisualization.directive('mapRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '='
      },
      template: '',
      replace: false,
      link: function($scope, element, attrs) {
        var map = L.mapbox.map(element[0]);
        var layer = null;
        
        $scope.$watch(
          function() {
            return element.is(':visible');
          }, 
          function(isVisible) {
            $scope.isVisible = isVisible;
          }
        );
        
        $scope.$watch('queryResult && queryResult.getData() && isVisible', function (data) {
          if (!data) {
            return;
          }
          
          if ($scope.queryResult.getData() == null) {
          } else {
            var data = $.extend(true, [], $scope.queryResult.getData());
            var latlngs = [];
            
            _.each(data, function(row){
              if (row.lat != undefined && row.lon != undefined) {
                latlngs.push({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [row.lon, row.lat]
                  },
                  properties: {
                    // title: 'A Single Marker',
                    // description: 'Just one of me',
                    'marker-size': 'small',
                    'marker-color': '#FFB200'
                  }
                });
              }
            });
            
            if (latlngs.length > 0) {
              if (layer != null) {
                map.removeLayer(layer);
              }
              
              map.setView([0,0], 10).addLayer(L.mapbox.tileLayer('examples.map-9ijuk24y', {
                detectRetina: true
              }));
              
              layer = L.mapbox.featureLayer(latlngs).addTo(map);
              map.fitBounds(layer.getBounds());
            }
          }
        });
      }
    }
  });
}());