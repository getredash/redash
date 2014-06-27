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

  var AdminGroupFormCtrl = function ($scope, Events, Group) {

     

  }

  var AdminUserCtrl = function ($scope, Events, User) {
    
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

    var user = new User();
     user.getUsers().$promise.then(function(groups) {
        $scope.users = users;
     });


  }

  var AdminGroupsCtrl = function ($scope, Events, Group) {    
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
        }                  
    ]


     var group = new Group();
     group.getGroups().$promise.then(function(groups) {
        $scope.groups = groups;
     });
  }

  angular.module('redash.admin_controllers', [])
         .controller('AdminStatusCtrl', ['$scope', 'Events', '$http', '$timeout', AdminStatusCtrl])
         .controller('AdminGroupsCtrl', ['$scope', 'Events', 'Group', AdminGroupsCtrl])
         .controller('AdminGroupFormCtrl', ['$scope', 'Events', 'Group', AdminGroupFormCtrl])
         .controller('AdminUsersCtrl', ['$scope', 'Events', 'Group', AdminUsersCtrl])
})();

