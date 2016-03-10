(function() {

  var SchemasCtrl = function($scope, $routeParams, $http, $location, $growl, Events, DataSource) {
    Events.record(currentUser, "view", "page", "schemas");
    $scope.$parent.pageTitle = "Schemas";

    $scope.schemas = [];
    DataSource.getSchema({'id': $routeParams.dataSourceId}, function(data) {
        $scope.schemas = data;
    });

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };


    $scope.gridColumns = [
      {
        "label": "Table",
        "map": "table",
        "cellTemplate": '<a href="/schemas/{{dataRow.datasource}}/tables/{{dataRow.id}}">{{dataRow.name}}</a>'
      },
      {
        'label': 'Description',
        'map': 'description'
      },
      {
        'label': 'Tags',
        'map': 'tags'
      }
    ];
  };

  angular.module('redash.controllers')
    .controller('SchemasCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'DataSource', SchemasCtrl])
})();
