(function () {
  var DataSourcesCtrl = function ($scope, $location, growl, Events, DataSource) {
    Events.record(currentUser, "view", "page", "admin/data_sources");
    $scope.$parent.pageTitle = "Data Sources";

    $scope.dataSources = DataSource.query();
    $scope.dataSourcesWithSchema = [];

    $scope.dataSources.$promise.then(function(sources) {
      _.each(sources,function(source) {
          DataSource.getSchema({id: source.id}, function (data) {
            if (data && data.length > 0) {
              source.hasSchema = true;
              $scope.dataSourcesWithSchema.push(source);
            } else {
              source.hasSchema = false;
            }
        })
      })
    });

    $scope.openDataSource = function(datasource) {
      $location.path('/data_sources/' + datasource.id);
    };

    $scope.deleteDataSource = function(event, datasource) {
      event.stopPropagation();
      Events.record(currentUser, "delete", "datasource", datasource.id);
      datasource.$delete(function(resource) {
        growl.addSuccessMessage("Data source deleted successfully.");
        this.$parent.dataSources = _.without(this.dataSources, resource);
      }.bind(this), function(httpResponse) {
        console.log("Failed to delete data source: ", httpResponse.status, httpResponse.statusText, httpResponse.data);
        growl.addErrorMessage("Failed to delete data source.");
      });
    }
  };

  var DataSourceCtrl = function ($scope, $routeParams, $http, $location, Events, DataSource) {
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
  };

  angular.module('redash.controllers')
    .controller('DataSourcesCtrl', ['$scope', '$location', 'growl', 'Events', 'DataSource', DataSourcesCtrl])
    .controller('DataSourceCtrl', ['$scope', '$routeParams', '$http', '$location', 'Events', 'DataSource', DataSourceCtrl])
})();
