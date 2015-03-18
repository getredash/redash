(function () {
  'use strict';

  var directives = angular.module('redash.directives');

  // Angular strips data- from the directive, so data-source-form becomes sourceForm...
  directives.directive('sourceForm', ['$http', 'growl', function ($http, growl) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/data_sources/form.html',
      scope: {
        'dataSource': '='
      },
      link: function ($scope) {
        var setType = function(types) {
          if ($scope.dataSource.type === undefined) {
            $scope.dataSource.type = types[0].type;
            return types[0];
          }

          $scope.type = _.find(types, function (t) {
            return t.type == $scope.dataSource.type;
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

        $http.get('/api/data_sources/types').success(function (types) {
          setType(types);

          $scope.dataSourceTypes = types;

          _.each(types, function (type) {
            _.each(type.configuration_schema.properties, function (prop, name) {
              if (name == 'password' || name == 'passwd') {
                prop.type = 'password';
              }

              if (_.string.endsWith(name, "File")) {
                prop.type = 'file';
              }

              prop.required = _.contains(type.configuration_schema.required, name);
            });
          });
        });

        $scope.$watch('dataSource.type', function(current, prev) {
          if (prev !== current) {
            if (prev !== undefined) {
              $scope.dataSource.options = {};
            }
            setType($scope.dataSourceTypes);
          }
        });

        $scope.saveChanges = function() {
          $scope.dataSource.$save(function() {
            growl.addSuccessMessage("Saved.");
          }, function() {
            growl.addErrorMessage("Failed saving.");
          });
        }
      }
    }
  }]);
})();
