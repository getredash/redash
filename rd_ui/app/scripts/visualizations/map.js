'use strict';

(function() {
  var module = angular.module('redash.visualization');

  module.config(['VisualizationProvider', function(VisualizationProvider) {
    var renderTemplate =
      '<map-renderer ' +
      'options="visualization.options" query-result="queryResult">' +
      '</map-renderer>';

    var editTemplate = '<map-editor></map-editor>';
    var defaultOptions = {};

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
        $scope.$watch('[queryResult && queryResult.getData(), visualization.options.draw,visualization.options.latColName,'+
            'visualization.options.lonColName,visualization.options.classify,visualization.options.classify]',
          function() {
            var marker = function(lat,lon){
              if (lat == null || lon == null) return;

              return L.marker([lat, lon]);
            };

            var heatpoint = function(lat,lon,obj){
              if (lat == null || lon == null) return;

              var color = 'red';

              if (obj &&
                obj[$scope.visualization.options.classify] &&
                $scope.visualization.options.classification){
                var v =  $.grep($scope.visualization.options.classification,function(e){
                  return e.value == obj[$scope.visualization.options.classify];
                });
                if (v.length >0) color = v[0].color;
              }

              var style = {
                fillColor:color,
                fillOpacity:0.5,
                stroke:false
              };

              return L.circleMarker([lat,lon],style)
            };

            var color = function(val){
              // taken from http://jsfiddle.net/xgJ2e/2/

              var h= Math.floor((100 - val) * 120 / 100);
              var s = Math.abs(val - 50)/50;
              var v = 1;

              var rgb, i, data = [];
              if (s === 0) {
                rgb = [v,v,v];
              } else {
                h = h / 60;
                i = Math.floor(h);
                data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];
                switch(i) {
                  case 0:
                    rgb = [v, data[2], data[0]];
                    break;
                  case 1:
                    rgb = [data[1], v, data[0]];
                    break;
                  case 2:
                    rgb = [data[0], v, data[2]];
                    break;
                  case 3:
                    rgb = [data[0], data[1], v];
                    break;
                  case 4:
                    rgb = [data[2], data[0], v];
                    break;
                  default:
                    rgb = [v, data[0], data[1]];
                    break;
                }
              }
              return '#' + rgb.map(function(x){
                return ("0" + Math.round(x*255).toString(16)).slice(-2);
              }).join('');
            };

            var queryData = $scope.queryResult.getData();
            var classify = $scope.visualization.options.classify;

            if (queryData) {
              $scope.visualization.options.classification = [];

              for (var row in queryData) {
                if (queryData[row][classify] &&
                  $.grep($scope.visualization.options.classification, function (e) {
                    return e.value == queryData[row][classify]
                  }).length == 0) {
                  $scope.visualization.options.classification.push({value: queryData[row][classify], color: null});
                }
              }

              $.each($scope.visualization.options.classification, function (i, c) {
                c.color = color(parseInt((i / $scope.visualization.options.classification.length) * 100));
              });

              if (!$scope.map) {
                $(elm[0].children[0]).replaceWith($("<div style='margin:20px;height:500px;width:500px;'></div>"));
                $scope.map = L.map(elm[0].children[0])
              }

              L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              }).addTo($scope.map);

              $scope.features = $scope.features || [];

              var tmp_features = [];

              var lat_col = $scope.visualization.options.latColName || 'lat';
              var lon_col = $scope.visualization.options.lonColName || 'lon';

              for (var row in queryData) {
                var feature;

                if ($scope.visualization.options.draw == 'Marker') {
                  feature = marker(queryData[row][lat_col], queryData[row][lon_col])
                } else if ($scope.visualization.options.draw == 'Heatmap') {
                  feature = heatpoint(queryData[row][lat_col], queryData[row][lon_col], queryData[row])
                }

                var obj_description = '<ul style="list-style-type: none;padding-left: 0">';

                for (var k in queryData[row]){
                  obj_description += "<li>" + k + ": " + queryData[row][k] + "</li>";
                }

                obj_description += '</ul>';
                feature.bindPopup(obj_description);
                tmp_features.push(feature);
              }

              $.each($scope.features, function (i, f) {
                $scope.map.removeLayer(f);
              });

              $scope.features = tmp_features;

              $.each($scope.features, function (i, f) {
                f.addTo($scope.map)
              });

              var group = new L.featureGroup($scope.features);
              $scope.map.fitBounds(group.getBounds());

              // We redraw the map if it was loaded in a hidden tab
              if ($('a[href="#'+$scope.visualization.id+'"]').length > 0) {
                $('a[href="#'+$scope.visualization.id+'"]').on('click', function () {
                  setTimeout(function() {
                    $scope.map.invalidateSize(false);
                    var group = new L.featureGroup($scope.features);
                    $scope.map.fitBounds(group.getBounds());
                  },500);
                });
              }
            }
          }, true);
      }
    }
  });

  module.directive('mapEditor', function() {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/map_editor.html',
      link: function($scope, elm, attrs) {
        $scope.visualization.options.draw_options = ['Marker','Heatmap'];
        $scope.visualization.options.classify_columns = $scope.queryResult.columnNames.concat('none')
      }
    }
  });

})();