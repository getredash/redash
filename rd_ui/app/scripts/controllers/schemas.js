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
        "cellTemplate": "{{dataRow.description}}"
      }
    ];
  };

  var SchemaCtrl = function ($scope, $routeParams, $http, $location, $filter, $growl, Events, Table, TableColumn, Join, Schema) {
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

    $scope.$on("updateDataRow",function(event,data){
      $scope.updateColRow(data);
    });

    $scope.gridConfig = {
      isPaginationEnabled: false,
      isGlobalSearchActivated: true
    };

    $scope.onRelatedTableSelected = function(item) {
        $scope.related_table = _.find($scope.schemas, function(table) {return table.name == item.name;});
    };

    $scope.updateColRow = function(row){
      var columns = $scope.table['columns'];
          var idx = columns.indexOf(row['item']);
          if (idx !== -1) {
            var newValue = row['item']['description'] == '' ? null:row['item']['description'];
            TableColumn.save({'id': row['item']['id'],'description':newValue},function (col) {
                $growl.addSuccessMessage("Saved.");
              }, function () {
                $growl.addErrorMessage("Failed saving alert.");
              });
          }
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
            //"cellTemplate": "{{dataRow.description ||''}}",
            'isEditable': true
        }
    ];

    $scope.joinGridColumns = [
        {
            "label": "Column",
            "map": "column",
            "headerClass": 'col-xs-3'
        },
        {
            'label': 'Relationship',
            'map': 'cardinality',
            'formatFunction': function(value) {
                return $filter('cardinalityHumanize')(value);
        },
            "headerClass": 'col-xs-3'
        },
        {
            'label': 'Related Table',
            'map': 'related_table',
            "cellTemplate": '<a href="/schemas/tables/{{dataRow.related_table_id}}">{{dataRow.related_table}}</a>',
            "headerClass": 'col-xs-3'
        },
        {
            'label': 'Related Column',
            'map': 'related_column',
            "headerClass": 'col-xs-3'
        }
      ];

    $scope.saveChanges = function() {
      var join = new Join();
      join.column_id = $scope.join.column.id;
      join.related_table_id = $scope.join.related_table.id;
      join.related_column = $scope.join.related_column;
      join.cardinality = $scope.join.cardinality;
      console.log(join);
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
    .controller('SchemaCtrl', ['$scope', '$routeParams', '$http', '$location', '$filter', 'growl', 'Events', 'Table', 'TableColumn', 'Join', 'Schema', SchemaCtrl])
})();
