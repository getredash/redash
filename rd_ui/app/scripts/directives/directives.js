(function () {
  'use strict';

  var directives = angular.module('redash.directives', []);

  directives.directive('appHeader', ['$location', 'Dashboard', 'notifications', function ($location, Dashboard) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: '/views/app_header.html',
      link: function ($scope) {
        $scope.dashboards = [];
        $scope.logoUrl = clientConfig.logoUrl;
        $scope.reloadDashboards = function () {
          Dashboard.query(function (dashboards) {
            $scope.dashboards = _.sortBy(dashboards, "name");
            $scope.allDashboards = _.groupBy($scope.dashboards, function (d) {
              var parts = d.name.split(":");
              if (parts.length == 1) {
                return "Other";
              }
              return parts[0];
            });
            $scope.otherDashboards = $scope.allDashboards['Other'] || [];
            $scope.groupedDashboards = _.omit($scope.allDashboards, 'Other');
          });
        };

        $scope.searchQueries = function() {
          $location.path('/queries/search').search({q: $scope.term});
        };

        $scope.reloadDashboards();

        $scope.currentUser = currentUser;
      }
    }
  }]);

  directives.directive('alertUnsavedChanges', ['$window', function ($window) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        'isDirty': '='
      },
      link: function ($scope) {
        var

          unloadMessage = "You will lose your changes if you leave",
          confirmMessage = unloadMessage + "\n\nAre you sure you want to leave this page?",

        // store original handler (if any)
          _onbeforeunload = $window.onbeforeunload;

        $window.onbeforeunload = function () {
          return $scope.isDirty ? unloadMessage : null;
        }

        $scope.$on('$locationChangeStart', function (event, next, current) {
          if (next.split("#")[0] == current.split("#")[0]) {
            return;
          }

          if ($scope.isDirty && !confirm(confirmMessage)) {
            event.preventDefault();
          }
        });

        $scope.$on('$destroy', function () {
          $window.onbeforeunload = _onbeforeunload;
        });
      }
    }
  }]);

  directives.directive('hashLink', ['$location', function($location) {
    return {
      restrict: 'A',
      scope: {
        'hash': '@'
      },
      link: function (scope, element) {
        var basePath = $location.path().substring(1);
        element[0].href = basePath + "#" + scope.hash;
      }
    };
  }]);

  directives.directive('rdTab', ['$location', function ($location) {
    return {
      restrict: 'E',
      scope: {
        'tabId': '@',
        'name': '@'
      },
      transclude: true,
      template: '<li class="rd-tab" ng-class="{active: tabId==selectedTab}"><a href="{{basePath}}#{{tabId}}">{{name}}<span ng-transclude></span></a></li>',
      replace: true,
      link: function (scope) {
        scope.basePath = $location.path().substring(1);
        scope.$watch(function () {
          return scope.$parent.selectedTab
        }, function (tab) {
          scope.selectedTab = tab;
        });
      }
    }
  }]);

  directives.directive('emailSettingsWarning', function() {
    return {
      restrict: 'E',
      template: '<p class="alert alert-danger" ng-if="showMailWarning">It looks like your mail server isn\'t configured. Make sure to configure it for the {{function}} to work.</p>',
      link: function(scope, elements, attrs) {
        scope.showMailWarning = clientConfig.mailSettingsMissing && currentUser.isAdmin;
        scope.function = attrs.function;
      }
    }
  });

  directives.directive('rdTabs', ['$location', function ($location) {
    return {
      restrict: 'E',
      scope: {
        tabsCollection: '=',
        selectedTab: '='
      },
      template: '<ul class="tab-nav bg-white"><li ng-class="{active: tab==selectedTab}" ng-repeat="tab in tabsCollection"><a href="{{basePath}}#{{tab.key}}">{{tab.name}}</a></li></ul>',
      replace: true,
      link: function ($scope, element, attrs) {
        $scope.basePath = $location.path().substring(1);
        $scope.selectTab = function (tabKey) {
          $scope.selectedTab = _.find($scope.tabsCollection, function (tab) {
            return tab.key == tabKey;
          });
        }

        $scope.$watch(function () {
          return $location.hash()
        }, function (hash) {
          if (hash) {
            $scope.selectTab($location.hash());
          } else {
            $scope.selectTab($scope.tabsCollection[0].key);
          }
        });
      }
    }
  }]);

  // From: http://jsfiddle.net/joshdmiller/NDFHg/
  directives.directive('editInPlace', function () {
    return {
      restrict: 'E',
      scope: {
        value: '=',
        ignoreBlanks: '=',
        editable: '=',
        done: '=',
      },
      template: function (tElement, tAttrs) {
        var elType = tAttrs.editor || 'input';
        var placeholder = tAttrs.placeholder || 'Click to edit';

        var viewMode = '';

        if (tAttrs.markdown == "true") {
          viewMode = '<span ng-click="editable && edit()" ng-bind-html="value|markdown" ng-class="{editable: editable}"></span>';
        } else {
          viewMode = '<span ng-click="editable && edit()" ng-bind="value" ng-class="{editable: editable}"></span>';
        }

        var placeholderSpan = '<span ng-click="editable && edit()" ng-show="editable && !value" ng-class="{editable: editable}">' + placeholder + '</span>';
        var editor = '<{elType} ng-model="value" class="rd-form-control"></{elType}>'.replace('{elType}', elType);

        return viewMode + placeholderSpan + editor;
      },
      link: function ($scope, element, attrs) {
        // Let's get a reference to the input element, as we'll want to reference it.
        var inputElement = angular.element(element.children()[2]);

        // This directive should have a set class so we can style it.
        element.addClass('edit-in-place');

        // Initially, we're not editing.
        $scope.editing = false;

        // ng-click handler to activate edit-in-place
        $scope.edit = function () {
          $scope.oldValue = $scope.value;

          $scope.editing = true;

          // We control display through a class on the directive itself. See the CSS.
          element.addClass('active');

          // And we must focus the element.
          // `angular.element()` provides a chainable array, like jQuery so to access a native DOM function,
          // we have to reference the first element in the array.
          inputElement[0].focus();
        };

        function save() {
          if ($scope.editing) {
            if ($scope.ignoreBlanks && _.isEmpty($scope.value)) {
              $scope.value = $scope.oldValue;
            }
            $scope.editing = false;
            element.removeClass('active');

            if ($scope.value !== $scope.oldValue) {
              $scope.done && $scope.done();
            }
          }
        }

        $(inputElement).keydown(function (e) {
          // 'return' or 'enter' key pressed
          // allow 'shift' to break lines
          if (e.which === 13 && !e.shiftKey) {
            save();
          } else if (e.which === 27) {
            $scope.value = $scope.oldValue;
            $scope.$apply(function () {
              $(inputElement[0]).blur();
            });
          }
        }).blur(function () {
          save();
        });
      }
    };
  });

  // http://stackoverflow.com/a/17904092/1559840
  directives.directive('jsonText', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, element, attr, ngModel) {
        function into(input) {
          return JSON.parse(input);
        }

        function out(data) {
          return JSON.stringify(data, undefined, 2);
        }

        ngModel.$parsers.push(into);
        ngModel.$formatters.push(out);

        scope.$watch(attr.ngModel, function (newValue) {
          element[0].value = out(newValue);
        }, true);
      }
    };
  });

  directives.directive('rdTimer', [function () {
    return {
      restrict: 'E',
      scope: { timestamp: '=' },
      template: '{{currentTime}}',
      controller: ['$scope' , function ($scope) {
        $scope.currentTime = "00:00:00";

        // We're using setInterval directly instead of $timeout, to avoid using $apply, to
        // prevent the digest loop being run every second.
        var currentTimer = setInterval(function () {
          $scope.currentTime = moment(moment() - moment($scope.timestamp)).utc().format("HH:mm:ss");
          $scope.$digest();
        }, 1000);

        $scope.$on('$destroy', function () {
          if (currentTimer) {
            clearInterval(currentTimer);
            currentTimer = null;
          }
        });
      }]
    };
  }]);

  directives.directive('rdTimeAgo', function () {
    return {
      restrict: 'E',
      scope: {
        value: '='
      },
      template: '<span>' +
        '<span ng-show="value" am-time-ago="value"></span>' +
        '<span ng-hide="value">-</span>' +
        '</span>'
    }
  });

  // Used instead of autofocus attribute, which doesn't work in Angular as there is no real page load.
  directives.directive('autofocus',
    ['$timeout', function ($timeout) {
      return {
        link: function (scope, element) {
          $timeout(function () {
            element[0].focus();
          });
        }
      };
    }]
  );

  directives.directive('compareTo', function () {
    return {
      require: "ngModel",
      scope: {
        otherModelValue: "=compareTo"
      },
      link: function (scope, element, attributes, ngModel) {
        var validate = function(value) {
          ngModel.$setValidity("compareTo", value === scope.otherModelValue);
        };

        scope.$watch("otherModelValue", function() {
          validate(ngModel.$modelValue);
        });

        ngModel.$parsers.push(function(value) {
          validate(value);
          return value;
        });
      }
    };
  });

  directives.directive('inputErrors', function () {
    return {
      restrict: "E",
      templateUrl: "/views/directives/input_errors.html",
      replace: true,
      scope: {
        errors: "="
      }
    };
  });

  directives.directive('onDestroy', function () {
    /* This directive can be used to invoke a callback when an element is destroyed,
    A useful example is the following:
    <div ng-if="includeText" on-destroy="form.text = null;">
      <input type="text" ng-model="form.text">
    </div>
    */
    return {
      restrict: "A",
      scope: {
        onDestroy: "&",
      },
      link: function(scope, elem, attrs) {
        scope.$on('$destroy', function() {
          scope.onDestroy();
        });
      }
    };
  });

  directives.directive('colorBox', function () {
    return {
      restrict: "E",
      scope: {color: "="},
      template: "<span style='width: 12px; height: 12px; background-color: {{color}}; display: inline-block; margin-right: 5px;'></span>"
    };
  });

  directives.directive('overlay', function() {
    return {
      restrict: "E",
      transclude: true,
      template: "" +
        '<div>' +
          '<div class="overlay"></div>' +
          '<div style="width: 100%; position:absolute; top:50px; z-index:2000">' +
            '<div class="well well-lg" style="width: 70%; margin: auto;" ng-transclude>' +
            '</div>' +
          '</div>' +
        '</div>'
    }
  });

  directives.directive('dynamicForm', ['$http', 'growl', '$q', function ($http, growl, $q) {
    return {
      restrict: 'E',
      replace: 'true',
      transclude: true,
      templateUrl: '/views/directives/dynamic_form.html',
      scope: {
        'target': '=',
        'type': '@type'
      },
      link: function ($scope) {
        var setType = function(types) {
          if ($scope.target.type === undefined) {
            $scope.target.type = types[0].type;
            return types[0];
          }

          $scope.type = _.find(types, function (t) {
            return t.type == $scope.target.type;
          });
        };

        $scope.files = {};

        $scope.$watchCollection('files', function() {
          _.each($scope.files, function(v, k) {
            if (v) {
              $scope.target.options[k] = v.base64;
            }
          });
        });

        var typesPromise = $http.get('api/' + $scope.type + '/types');

        $q.all([typesPromise, $scope.target.$promise]).then(function(responses) {
            var types = responses[0].data;
            setType(types);

            $scope.types = types;

            _.each(types, function (type) {
              _.each(type.configuration_schema.properties, function (prop, name) {
                if (name == 'password' || name == 'passwd') {
                  prop.type = 'password';
                }

                if (_.string.endsWith(name, "File")) {
                  prop.type = 'file';
                }

                if (prop.type == 'boolean') {
                  prop.type = 'checkbox';
                }

                 prop.required = _.contains(type.configuration_schema.required, name);
              });
           });
        });

        $scope.$watch('target.type', function(current, prev) {
          if (prev !== current) {
            if (prev !== undefined) {
              $scope.target.options = {};
            }
            setType($scope.types);
          }
        });

        $scope.saveChanges = function() {
          $scope.target.$save(function() {
            growl.addSuccessMessage("Saved.");
          }, function() {
            growl.addErrorMessage("Failed saving.");
          });
        }
      }
    }
  }]);

  directives.directive('pageHeader', function() {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl: '/views/directives/page_header.html',
      link: function(scope, elem, attrs) {
        attrs.$observe('title', function(value){
          scope.title = value;
        });
      }
    }
  });

  directives.directive('settingsScreen', ['$location', function($location) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl: '/views/directives/settings_screen.html',
      link: function(scope, elem, attrs) {
        scope.usersPage = _.string.startsWith($location.path(), '/users');
        scope.groupsPage = _.string.startsWith($location.path(), '/groups');
        scope.dsPage = _.string.startsWith($location.path(), '/data_sources');
        scope.destinationsPage = _.string.startsWith($location.path(), '/destinations');

        scope.showGroupsLink = currentUser.hasPermission('list_users');
        scope.showUsersLink = currentUser.hasPermission('list_users');
        scope.showDsLink = currentUser.hasPermission('admin');
        scope.showDestinationsLink = currentUser.hasPermission('admin');
      }
    }
  }]);

})();
