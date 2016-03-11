(function() {

  var SchemasCtrl = function($scope, $routeParams, $http, $location, $growl, Events, Schema) {
    Events.record(currentUser, "view", "page", "schemas");
    $scope.$parent.pageTitle = "Schemas";

    $scope.schemas = [];
    Schema.get({'id': $routeParams.dataSourceId}, function(data) {
        $scope.schemas = data;
    });

    $scope.gridConfig = {
      maxSize: 8,
    };


    $scope.gridColumns = [
      {
        "label": "Table",
        "map": "table",
        "cellTemplate": '<a href="/schemas/tables/{{dataRow.id}}">{{dataRow.name}}</a>'
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

  var SchemaCtrl = function ($scope, $routeParams, $http, $location, $growl, Events, Table, Column, Join) {
    Events.record(currentUser, "view", "page", "tables");
    $scope.$parent.pageTitle = "Table";

    $scope.table = {};
    $scope.table = Table.get({'id': $routeParams.tableId}, function(data) {
        $scope.table = data;
    });

    $scope.saveTableDescription = function() {
      Table.save({'id': $scope.table.id, 'description': $scope.table.description});
    };

    $scope.gridConfig = {
      isPaginationEnabled: false,
      maxSize: 8
    };


    $scope.gridColumns = [
      {
        "label": "Column",
        "map": "name",
      },
      {
        'label': 'Data type',
        'map': 'data_type'
      },
      {
        'label': 'Description',
        'map': 'description'
      }
    ];

    $scope.joinGridColumns = [
      {
        "label": "Column",
        "map": "column",
      },
      {
        'label': 'Join type',
        'map': 'cardinality'
      },
      {
        'label': 'Related Table',
        'map': 'related_table'
      },
      {
        'label': 'Related Column',
        'map': 'related_column'
      }
    ];

    $scope.saveChanges = function() {
      var join = new Join();
      join.table = $scope.table.id;
      join.column = $scope.join.column;
      join.related_table = $scope.join.related_table;
      join.related_column = $scope.join.related_column;
      join.cardinality = $scope.join.cardinality;
      join.$save(function(join) {
        $growl.addSuccessMessage("Saved.");
      }, function() {
        $growl.addErrorMessage("Failed saving alert.");
      });
    };

  };

  angular.module('redash.controllers')
    .controller('SchemasCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'Schema', SchemasCtrl])
    .controller('SchemaCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'Table', 'Column', 'Join', SchemaCtrl])
})();
