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
    var getCenterFromCoordinates = function(data) {
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
                latlngs.push([row.lat, row.lon]);
              }
            });
            
            if (latlngs.length > 0) {
              center = getCenterFromCoordinates(latlngs);
              
              if (layer != null) {
                map.removeLayer(layer);
              }
              
              map.setView(center, 10).addLayer(L.mapbox.tileLayer('hailocabs.g9mb2ka2', {
                detectRetina: true
              }));
              
              layer = L.heatLayer(latlngs, {maxZoom: 12, blur: 50}).addTo(map);
            }
          }
        });
      }
    }
  });
}());