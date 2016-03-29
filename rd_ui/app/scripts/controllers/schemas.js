(function() {

  var SchemasCtrl = function($scope, $routeParams, $http, $location, $growl, Events, DataSource) {
    Events.record(currentUser, "view", "page", "schemas");
    $scope.$parent.pageTitle = "Schemas";

    $scope.schemas = [];
    DataSource.getSchema({'id': $routeParams.dataSourceId}, function(data) {
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
        "cellTemplate": '<a href="/schemas/{{dataRow.datasource.id}}/tables/{{dataRow.id}}">{{dataRow.name}}</a>'
    },
    {
        'label': 'Description',
        'map': 'description',
        "cellTemplate": "{{dataRow.description}}"
      }
    ];
  };

  var SchemaCtrl = function ($scope, $routeParams, $http, $location, $filter, $growl, Events, Table, TableColumn, Join, DataSource) {
    Events.record(currentUser, "view", "page", "tables");
    $scope.$parent.pageTitle = "Table";


    DataSource.getSchema({'id': $routeParams.dataSourceId}, function(data) {
      $scope.schemas = data;
      $scope.table = _.findWhere(data,{id:parseInt($routeParams.tableId)});
    });


    $scope.saveTableDescription = function() {
      Table.save({'id': $scope.table.id, 'description': $scope.table.description},function (tab) {
          $growl.addSuccessMessage("Table description updated");
        }, function () {
          $growl.addErrorMessage("Failed updating table description");
        });
    };

    $scope.$on("updateDataRow",function(event,data){
      $scope.updateColRow(data);
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

    $scope.updateColRow = function(row){
      var columns = $scope.table['columns'];
          var idx = columns.indexOf(row['item']);
          if (idx !== -1) {
            var newValue = row['item']['description'] == '' ? null:row['item']['description'];
            TableColumn.save({'id': row['item']['id'],'description':newValue},function (col) {
                $growl.addSuccessMessage("Column description updated");
              }, function () {
                $growl.addErrorMessage("Failed updating column description");
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
      join.related_column = $scope.join.related_column.name;
      join.cardinality = $scope.join.cardinality;
      join.$save(function(join) {
          $growl.addSuccessMessage("New relation saved");
          $scope.table.joins.push(join);
      }, function() {
          $growl.addErrorMessage("Failed saving new relation");
      });
    };
};

angular.module('redash.controllers')
    .controller('SchemasCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'DataSource', SchemasCtrl])
    .controller('SchemaCtrl', ['$scope', '$routeParams', '$http', '$location', '$filter', 'growl', 'Events', 'Table', 'TableColumn', 'Join', 'DataSource', SchemaCtrl])
})();
