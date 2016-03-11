(function() {

  var SchemasCtrl = function($scope, $routeParams, $http, $location, $growl, Events, Schema) {
    Events.record(currentUser, "view", "page", "schemas");
    $scope.$parent.pageTitle = "Schemas";

    $scope.schemas = [];
    Schema.get({'id': $routeParams.dataSourceId}, function(data) {
        $scope.schemas = _.map(data, function(d) { return _.pick(d, 'description', 'datasource', 'id', 'name')});
    });

    $scope.gridConfig = {
      isPaginationEnabled: false,
      isGlobalSearchActivated: true
    };


    $scope.gridColumns = [
    {
        "label": "Table",
        "map": "table",
        "cellTemplate": '<a href="/schemas/tables/{{dataRow.id}}">{{dataRow.name}}</a>'
    },
    {
        'label': 'Description',
        'map': 'description',
        "cellTemplate": "{{dataRow.description ||''}}"
      }
    ];
  };

  var SchemaCtrl = function ($scope, $routeParams, $http, $location, $filter, $growl, Events, Table, Column, Join, Schema) {
    Events.record(currentUser, "view", "page", "tables");
    $scope.$parent.pageTitle = "Table";

    $scope.table = {};
    $scope.table = Table.get({'id': $routeParams.tableId}, function(data) {
        $scope.table = data;
        $scope.schema = {};
        Schema.get({'id': $scope.table.datasource.id}, function(data) {
            $scope.schemas = data;
        });
    });

    $scope.saveTableDescription = function() {
      Table.save({'id': $scope.table.id, 'description': $scope.table.description});
    };

    $scope.gridConfig = {
      isPaginationEnabled: false,
      isGlobalSearchActivated: true
    };

    $scope.onRelatedTableSelected = function(item) {
        $scope.related_table = _.find($scope.schemas, function(table) {return table.name == item.name;});
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
        'map': 'description',
        "cellTemplate": "{{dataRow.description ||''}}"
      }
  ];

    $scope.joinGridColumns = [
      {
        "label": "Column",
        "map": "column",
      },
      {
        'label': 'Relationship',
        'map': 'cardinality',
        'formatFunction': function(value) {
            return $filter('cardinalityHumanize')(value);
        }
      },
      {
        'label': 'Related Table',
        'map': 'related_table',
        "cellTemplate": '<a href="/schemas/tables/{{dataRow.related_table_id}}">{{dataRow.related_table}}</a>'
      },
      {
        'label': 'Related Column',
        'map': 'related_column'
      }
    ];

    $scope.saveChanges = function() {
      var join = new Join();
      join.column_id = $scope.join.column.id;
      join.related_column_id = $scope.join.related_column.id;
      join.cardinality = $scope.join.cardinality;
      join.$save(function(join) {
        $growl.addSuccessMessage("Saved.");
        $scope.table.joins.push(join);
      }, function() {
        $growl.addErrorMessage("Failed saving alert.");
      });
    };
};

  angular.module('redash.controllers')
    .controller('SchemasCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'Schema', SchemasCtrl])
    .controller('SchemaCtrl', ['$scope', '$routeParams', '$http', '$location', '$filter', 'growl', 'Events', 'Table', 'Column', 'Join', 'Schema', SchemaCtrl])
})();
