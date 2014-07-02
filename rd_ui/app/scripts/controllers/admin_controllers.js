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


  var AdminUserFormCtrl = function ($location, $scope, $routeParams, Events, Users, User, Groups) {

    var groups = [];

    groups.push();

    var loadData = function(user)  {    

      if (user != null) {
        // get relevant user
        user.$get(function(user) {

          // map user to scope
          $scope.user = user;  

          // set user form name, email address and ID
          $scope.name = user.name;

          $scope.email = user.email;

          $scope.id = user.id;          

        var groups = [];
          for (key in user.groups) {
            groups.push({id: user.groups[key], text: user.groups[key]});
          }

          // tables
          $scope.groups = groups;
        })
      }
    }

    var groups = new Groups();
    groups.get().$promise.then(function(result) {

      var groups = [];
      for (key in result) {
        if (result[key]["name"] != null) {
          var group = {};
          group["id"] = result[key]["name"];
          group["text"] = result[key]["name"];
          groups.push(group)
        }         
      }
      $scope.allgroups = groups;
    });

    if ($routeParams.id != null) {
      var user = new User({id: $routeParams.id});
      loadData(user);
    }

    $scope.submit = function() {
      var post = {};     

      if ($routeParams.id == null) {

        post.email = $scope.email;
        post.id = $scope.id;        
        post.name = $scope.name;
        post.groups = [];
        post.groups = $scope.groups;
        var user = User.new(post)
        user.$save(function(result){
          $location.path("/admin/users");
        });
      
      // edit existing record
      } else {

        // update 
        var userResource = new User({id: $routeParams.id});
        userResource.$get(function(user) {
          user.email = $scope.email;          
          user.name = $scope.name;
          user.groups = $scope.groups;
          user.$save(function(result) {
            $location.path("/admin/users");
          });
        });
      }
      
    };

    $scope.multi = {
        multiple: true,
        query: function (query) {
            query.callback({ results: $scope.allgroups });
        }
    };
  } 

  var AdminGroupFormCtrl = function ($location, $scope, $routeParams, Events, Groups, Group) {

    $scope.permissions = {create_dashboard: false, create_query: false, edit_dashboard: false, edit_query: false, view_query: false, view_source: false, execute_query:false};
    
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

          // tables
          $scope.tables = tables;
        })
      }
    }

    if ($routeParams.id != null) { 
      var group = new Group({id: $routeParams.id});
      loadData(group);
    }

    // available tables
    var tables = [
        { id: 'jss_pmuh', text: 'jss_pmuh' },
        { id: 'jss_allocation', text: 'jss_allocation' },
        { id: 'jss_fareQuote', text: 'jss_fareQuote' },
        ];

    $scope.multi = {
        multiple: true,
        query: function (query) {
            query.callback({ results: tables });
        },
        initSelection: function (element, callback) {
            var val = $(element).select2('val'),
            results = [];
            for (var i=0; i<val.length; i++) {
                results.push(findState(val[i]));
            }
            callback(results);
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
    },
    {
        "label": "Actions",
        "cellTemplateUrl": "/views/admin_users_actions_cell.html"
    }
    ]

    var users = new Users();
     users.getUsers().$promise.then(function(result) {
        $scope.users = result;
     });


  }

  var AdminGroupsCtrl = function ($scope, Events, Groups) {    
   
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
      return table;
    }

    $scope.groupColumns = [
      {
        "label": "Name",
        "map": "name"
      },
      {
        "label": "ID",
        "map": "id"
      },
      {
        'label': 'Tables',
        'map': 'tables',
        'formatFunction': tableFormatter     
      },    
      {
        "label": "Created At",
        "map": "created_at",
        'formatFunction': dateFormatter           
      },      
      {
        "label": "Permissions",
        "map": "permissions",
        'formatFunction': permissionsFormatter
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
         .controller('AdminUserFormCtrl', ['$location', '$scope', '$routeParams', 'Events', 'Users','User', 'Groups', AdminUserFormCtrl])
         .controller('AdminGroupsCtrl', ['$scope', 'Events', 'Groups', AdminGroupsCtrl])
         .controller('AdminGroupFormCtrl', ['$location', '$scope', '$routeParams', 'Events', 'Groups','Group', AdminGroupFormCtrl])
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
