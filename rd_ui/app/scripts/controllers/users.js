(function () {
  var UsersCtrl = function ($scope, $location, growl, Events, User) {
    Events.record(currentUser, "view", "page", "users");
    $scope.$parent.pageTitle = "Users";

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };

    $scope.gridColumns = [
      {
        "label": "",
        "map": "gravatar_url",
        "cellTemplate": '<img src="{{dataRow.gravatar_url}}" height="40px"/>'
      },
      {
        "label": "Name",
        "map": "name",
        "cellTemplate": '<a href="/users/{{dataRow.id}}">{{dataRow.name}}</a>'
      },
      {
        'label': 'Joined',
        'cellTemplate': '<span am-time-ago="dataRow.created_at"></span>'
      }
    ];

    $scope.users = [];
    User.query(function(users) {
      $scope.users = users;
    });
  };

  var UserCtrl = function ($scope, $routeParams, $http, $location, growl, Events, User) {
    $scope.$parent.pageTitle = "Users";

    $scope.userId = $routeParams.userId;

    if ($scope.userId === 'me') {
      $scope.userId = currentUser.id;
    }
    Events.record(currentUser, "view", "user", $scope.userId);
    $scope.canEdit = currentUser.hasPermission("admin") || currentUser.id === parseInt($scope.userId);
    $scope.showSettings =  false;
    $scope.showPasswordSettings = false;

    $scope.selectTab = function(tab) {
      _.each($scope.tabs, function(v, k) {
        $scope.tabs[k] = (k === tab);
      });
    };

    $scope.setTab = function(tab) {
      $location.hash(tab);
    }

    $scope.tabs = {
      profile: false,
      apiKey: false,
      settings: false,
      password: false
    };

    $scope.selectTab($location.hash() || 'profile');

    $scope.user = User.get({id: $scope.userId}, function(user) {
      if (user.auth_type == 'password') {
        $scope.showSettings = $scope.canEdit;
        $scope.showPasswordSettings = $scope.canEdit;
      }
    });

    $scope.password = {
      current: '',
      new: '',
      newRepeat: ''
    };

    $scope.savePassword = function(form) {
      $scope.$broadcast('show-errors-check-validity');

      if (!form.$valid) {
        return;
      }

      var data = {
        id: $scope.user.id,
        password: $scope.password.new,
        old_password: $scope.password.current
      };

      User.save(data, function() {
        growl.addSuccessMessage("Password Saved.")
        $scope.password = {
          current: '',
          new: '',
          newRepeat: ''
        };
      }, function(error) {
        var message = error.data.message || "Failed saving password.";
        growl.addErrorMessage(message);
      });
    };

    $scope.updateUser = function(form) {
      $scope.$broadcast('show-errors-check-validity');

      if (!form.$valid) {
        return;
      }

      var data = {
        id: $scope.user.id,
        name: $scope.user.name,
        email: $scope.user.email
      };

      if ($scope.user.admin === true && $scope.user.groups.indexOf("admin") === -1) {
        data.groups = $scope.user.groups.concat("admin");
      } else if ($scope.user.admin === false && $scope.user.groups.indexOf("admin") !== -1) {
        data.groups = _.without($scope.user.groups, "admin");
      }

      User.save(data, function(user) {
        growl.addSuccessMessage("Saved.")
        $scope.user = user;
      }, function(error) {
        var message = error.data.message || "Failed saving.";
        growl.addErrorMessage(message);
      });
    };
  };

  var NewUserCtrl = function ($scope, $location, growl, Events, User) {
    Events.record(currentUser, "view", "page", "users/new");

    $scope.user = new User({});
    $scope.saveUser = function() {
      $scope.$broadcast('show-errors-check-validity');

      if (!$scope.userForm.$valid) {
        return;
      }

      $scope.user.$save(function(user) {
        growl.addSuccessMessage("Saved.")
        $location.path('/users/' + user.id).replace();
      }, function(error) {
        var message = error.data.message || "Failed saving.";
        growl.addErrorMessage(message);
      });
    }
  };

  angular.module('redash.controllers')
    .controller('UsersCtrl', ['$scope', '$location', 'growl', 'Events', 'User', UsersCtrl])
    .controller('UserCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'User', UserCtrl])
    .controller('NewUserCtrl', ['$scope', '$location', 'growl', 'Events', 'User', NewUserCtrl])
})();
