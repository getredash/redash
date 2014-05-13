(function () {
  var heatmapVisualization = angular.module('redash.visualization');

  heatmapVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    VisualizationProvider.registerVisualization({
      type: 'HEATMAP',
      name: 'Heatmap',
      renderTemplate: '<heatmap-renderer class="col-lg-12" query-result="queryResult"></heatmap-renderer>'
    });
  }]);

  heatmapVisualization.directive('heatmapRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '='
      },
      template: '',
      replace: false,
      link: function($scope, element, attrs) {
        $scope.$watch('queryResult && queryResult.getData()', function (data) {
          if (!data) {
            return;
          }
          
          if ($scope.queryResult.getData() == null) {
          } else {
            var data = $.extend(true, [], $scope.queryResult.getData());
            var latlngs = [];
            _.each(data, function(row){
              if (row.lat != undefined && row.lng != undefined) {
                latlngs.push([row.lat, row.lng]);
              }
            });
            
            if (latlngs.length > 0) {
              center = heatmapVisualization.getCenterFromCoordinates(latlngs);
              
              console.log(element.width())
              var map = L.mapbox.map(element[0]);
              map.markerLayer.clearLayers();
              map.setView(center, 10).addLayer(L.mapbox.tileLayer('examples.map-9ijuk24y', {
                detectRetina: true
              }));
              
                // var heat = L.heatLayer(latlngs, {maxZoom: 12}).addTo(map);
            }
          }
        });
      }
    }
  });
  
  heatmapVisualization.getCenterFromCoordinates = function(data) {
    var x = 0.0;
    var y = 0.0;
    var z = 0.0;
    var total = data.length;
    
    _.each(data, function(row){
      var lat = row[0] * Math.PI / 180;
      var lon = row[1] * Math.PI / 180;
      
      x += Math.cos(lat) * Math.cos(lon);
      y += Math.cos(lat) * Math.sin(lon);
      z += Math.sin(lat);
    });
    
    x /= total;
    y /= total;
    z /= total;
    
    lon = Math.atan2(y, x);
    hyp = Math.sqrt(x * x + y * y);
    lat = Math.atan2(z, hyp);
    
    return [lat * 180 / Math.PI, lon * 180 / Math.PI];
  }
}());