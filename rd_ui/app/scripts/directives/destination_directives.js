(function () {
  'use strict';

  var directives = angular.module('redash.directives');

  directives.directive('destinationForm', ['$http', 'growl', function ($http, growl) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/destinations/form.html',
      scope: {
        'destination': '='
      },
      link: function ($scope) {
        var setType = function(types) {
          if ($scope.destination.type === undefined) {
            $scope.destination.type = types[0].type;
            return types[0];
          }

          $scope.type = _.find(types, function (t) {
            return t.type == $scope.destination.type;
          });
        };

        $scope.files = {};

        $scope.$watchCollection('files', function() {
          _.each($scope.files, function(v, k) {
            if (v) {
              $scope.dataSource.options[k] = v.base64;
            }
          });
        });


        $http.get('api/destinations/types').success(function (types) {
          setType(types);

          $scope.destinationTypes = types;

          _.each(types, function (type) {
            _.each(type.configuration_schema.properties, function (prop, name) {
              if (name == 'password' || name == 'passwd') {
                prop.type = 'password';
              }

              if (_.string.endsWith(name, "File")) {
                prop.type = 'file';
              }

              if (prop.type == 'boolean') {
                prop.type = 'checkbox';
              }

              prop.required = _.contains(type.configuration_schema.required, name);
            });
          });
        });

        $scope.$watch('destination.type', function(current, prev) {
          if (prev !== current) {
            if (prev !== undefined) {
              $scope.destination.options = {};
            }
            setType($scope.destinationTypes);
          }
        });

        $scope.saveChanges = function() {
          $scope.destination.$save(function() {
            growl.addSuccessMessage("Saved.");
          }, function() {
            growl.addErrorMessage("Failed saving.");
          });
        }
      }
    }
  }]);
})();
