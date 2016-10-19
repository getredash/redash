(function () {
  var DataSourcesCtrl = function ($scope, $location, growl, Events, DataSource) {
    Events.record(currentUser, "view", "page", "admin/data_sources");
    $scope.$parent.pageTitle = "Data Sources";

    $scope.dataSources = DataSource.query();

  };

  var DataSourceCtrl = function ($scope, $routeParams, $http, $location, growl, Events, DataSource) {
    Events.record(currentUser, "view", "page", "admin/data_source");
    $scope.$parent.pageTitle = "Data Sources";

    $scope.dataSourceId = $routeParams.dataSourceId;

    if ($scope.dataSourceId == "new") {
      $scope.dataSource = new DataSource({options: {}});
    } else {
      $scope.dataSource = DataSource.get({id: $routeParams.dataSourceId});
    }

    $scope.$watch('dataSource.id', function(id) {
      if (id != $scope.dataSourceId && id !== undefined) {
        $location.path('/data_sources/' + id).replace();
      }
    });

    $scope.delete = function () {
      Events.record(currentUser, "delete", "datasource", $scope.dataSource.id);

      $scope.dataSource.$delete(function (resource) {
        growl.addSuccessMessage("Data source deleted successfully.");
        $location.path('/data_sources/');
      }.bind(this), function (httpResponse) {
        console.log("Failed to delete data source: ", httpResponse.status, httpResponse.statusText, httpResponse.data);
        growl.addErrorMessage("Failed to delete data source.");
      });
    }
    $scope.test = function () {
      DataSource.test({id: $scope.dataSource.id}, function (httpResponse) {
        if (httpResponse.ok) {
          growl.addSuccessMessage('<i class="fa fa-check-circle"></i> <strong>Success.</strong>', {enableHtml: true, ttl: 3000});
        } else {
          growl.addErrorMessage('<i class="fa fa-exclamation-triangle"></i> <strong>Connection Test Failed:</strong><br/>' + httpResponse.message, {enableHtml: true, ttl: -1});
        }
      }, function (httpResponse) {
        console.log("Failed to test data source: ", httpResponse.status, httpResponse.statusText, httpResponse);
        growl.addErrorMessage('<i class="fa fa-exclamation-triangle"></i> <strong> Unknown error occurred while performing connection test. Please try again later.', {enableHtml: true, ttl: -1});
      });
    }
  };

  angular.module('redash.controllers')
    .controller('DataSourcesCtrl', ['$scope', '$location', 'growl', 'Events', 'DataSource', DataSourcesCtrl])
    .controller('DataSourceCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'DataSource', DataSourceCtrl])
})();
