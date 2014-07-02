(function () {
  var AdminStatusCtrl = function ($scope, Events, $http, $timeout) {
    Events.record(currentUser, "view", "page", "admin/status");
    $scope.$parent.pageTitle = "System Status";

    var refresh = function () {
      $scope.refresh_time = moment().add('minutes', 1);
      $http.get('/status.json').success(function (data) {
        $scope.workers = data.workers;
        delete data.workers;
        $scope.manager = data.manager;
        delete data.manager;
        $scope.status = data;
      });

      $timeout(refresh, 59 * 1000);
    };

    refresh();
  }   

  var AdminGroupFormCtrl = function ($location, $scope, $routeParams, Events, Groups, Group, Table) {
    
    // check user permissions
    if (! currentUser.hasPermission("admin_groups") && ! currentUser.hasPermission("admin")) {
      $location.path("/");
    }

    $scope.permissions = {create_dashboard: false, create_query: false, edit_dashboard: false, edit_query: false, view_query: false, view_source: false, execute_query:false, admin: false, admin_groups: false, admin_users: false};
    
    var loadData = function(group)  {

      if (group != null) {

        // get relevant group
        group.$get(function(group) {

          // map group to scope
          $scope.group = group;  

          // set group form name
          $scope.name = group.name;

          // populate permissions
          for (key in group.permissions) {

            // get permission name
            var permission = group.permissions[key]

            // set form permission on true
            $scope.permissions[permission] = true;
          }

          // populate tables
          var tables = [];


          for (key in group.tables) {
            tables.push({id: group.tables[key], text: group.tables[key]});
          }

          tables.sort(function(a, b){
              if(a.id < b.id) return -1;
              if(a.id > b.id) return 1;
              return 0;
          })

          // tables
          $scope.tables = tables;
        })
      }
    }

    if ($routeParams.id != null) { 
      var group = new Group({id: $routeParams.id});
      loadData(group);
    }

    $scope.alltables = [];

    var tableResource = new Table();
    tableResource.$get(function(tables) {
      var alltables = [];
      for (key in tables["tablenames"]) {
        var table = {};
        table["id"] = tables["tablenames"][key];
        table["text"] = tables["tablenames"][key];
        $scope.alltables.push(table);
      } 
    });

    // add * wildcard which alows to add a permission to all tables
    var table = {};
    table["id"] = "*";
    table["text"] = "*";
    $scope.alltables.push(table);


    $scope.multi = {
      multiple: true,
      query: function (query) {
          query.callback({ results: $scope.alltables });
      },
      sortResults: function(results, container, query) {

      // matching search results
      if (query.term) {
        res = [];
        for (var j=0; j<results.length; j++) {
          if (results[j]["id"].match(query.term)) res.push(results[j]);
        }
        return res;
      }

      return results;
      }
    };

    $scope.submit = function() {
      var post = {};

      var perms = [];
      var tables = [];

      for (key in $scope.permissions) {
        if ($scope.permissions[key] == true) {
          perms.push(key);
        }
      }

      for (key in $scope.tables) {
        tables.push($scope.tables[key].id);
      }

      if ($routeParams.id == null) {

        post.permissions = perms;
        post.tables = tables;
        post.name = $scope.name;

        var group = Group.new(post)
        group.$save(function(result){
          $location.path("/admin/groups");
        });
      
      // edit existing record
      } else {

        // update 
        var groupResource = new Group({id: $routeParams.id});
        groupResource.$get(function(group) {
          group.permissions = perms;
          group.tables = tables;
          group.name = $scope.name;
          group.$save(function(result) {
            $location.path("/admin/groups");
          });
        });
      }
      
    };
  }

  var AdminUsersCtrl = function ($scope, Events, Users) {
    
    $scope.userColumns =[
    {
      "label": "ID",
      "map": "id"
    },
    {
      "label": "Name",
      "map": "name"
    },
    {
      "label": "Email",
      "map": "email"
    }
    ]

    var users = new Users();
     users.getUsers().$promise.then(function(result) {
        $scope.users = result;
     });


  }

  var AdminGroupsCtrl = function ($scope, $location, Events, Groups) {    
   
    if (! currentUser.hasPermission("admin_groups") && ! currentUser.hasPermission("admin")) {
      $location.path("/");
    }

    var dateFormatter = function (date) {
      value = moment(date);
      if (!value) return "-";
      return value.format("DD/MM/YY HH:mm");
    }

    var permissionsFormatter = function (permissions) {
      value = permissions.join(', ');      
      if (!value) return "-";
      return value.replace(new RegExp("_", "g"), " ");
    }

    var tableFormatter = function (table) {
      return table.join(', ');
    }

    $scope.groupConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
      isGlobalSearchActivated: true
    }

    $scope.groupColumns = [
      {
        "label": "Permission group name",
        "map": "name"
      },
      {
        "label": "Created At",
        "map": "created_at",
        'formatFunction': dateFormatter           
      },      
      {
        "label": "Actions",
        "cellTemplateUrl": "/views/admin_groups_actions_cell.html"
      }
    ]

     var groups = new Groups();
     groups.get().$promise.then(function(res) {
        $scope.groups = res;
     });
  }

  angular.module('redash.admin_controllers', [])
         .controller('AdminStatusCtrl', ['$scope', 'Events', '$http', '$timeout', AdminStatusCtrl])
         .controller('AdminUsersCtrl', ['$scope', 'Events', 'Users', AdminUsersCtrl])
         .controller('AdminGroupsCtrl', ['$scope', '$location', 'Events', 'Groups', AdminGroupsCtrl])
         .controller('AdminGroupFormCtrl', ['$location', '$scope', '$routeParams', 'Events', 'Groups','Group','Table', AdminGroupFormCtrl])
         // .directive('applystyle', function() {
         //    return {
         //        // Restrict it to be an attribute in this case
         //        restrict: 'A',
         //        // responsible for registering DOM listeners as well as updating the DOM
         //        link: function(scope, element, attrs) {
         //          $('#select2-choices').class('form-control');
         //        }
         //    };
         //  });
         
})();
