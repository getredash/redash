(function () {
  'use strict';

  var directives = angular.module('redash.directives', []);

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
          if (next.split("?")[0] == current.split("?")[0] || next.split("#")[0] == current.split("#")[0]) {
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
        'name': '@',
        'basePath': '=?'
      },
      transclude: true,
      template: '<li class="rd-tab" ng-class="{active: tabId==selectedTab}"><a href="{{basePath}}#{{tabId}}">{{name}}<span ng-transclude></span></a></li>',
      replace: true,
      link: function (scope) {
        scope.basePath = scope.basePath || $location.path().substring(1);
        scope.$watch(function () {
          return scope.$parent.selectedTab
        }, function (tab) {
          scope.selectedTab = tab;
        });
      }
    }
  }]);

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

  directives.directive('tabNav', ['$location', function($location) {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        tabs: '='
      },
      template: '<ul class="tab-nav bg-white">' +
                  '<li ng-repeat="tab in tabs" ng-class="{\'active\': tab.active }"><a ng-href="{{tab.path}}">{{tab.name}}</a></li>' +
                '</ul>',
      link: function($scope) {
        _.each($scope.tabs, function(tab) {
          if (tab.isActive) {
            tab.active = tab.isActive($location.path());
          } else {
            tab.active = _.string.startsWith($location.path(), "/" + tab.path);
          }
        });
      }
    }
  }]);

  directives.directive('queriesList', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        queries: '=',
        total: '=',
        selectPage: '=',
        page: '=',
        pageSize: '='
      },
      templateUrl: '/views/directives/queries_list.html',
      link: function ($scope) {
        function hasNext() {
          return !($scope.page * $scope.pageSize >= $scope.total);
        }

        function hasPrevious() {
          return $scope.page !== 1;
        }

        function updatePages() {
          if ($scope.total === undefined) {
            return;
          }

          var maxSize = 5;
          var pageCount = Math.ceil($scope.total/$scope.pageSize);
          var pages = [];

          function makePage(title, page, disabled) {
            return {title: title, page: page, active: page == $scope.page, disabled: disabled};
          }

          // Default page limits
          var startPage = 1, endPage = pageCount;

          // recompute if maxSize
          if (maxSize && maxSize < pageCount) {
            startPage = Math.max($scope.page - Math.floor(maxSize / 2), 1);
            endPage = startPage + maxSize - 1;

            // Adjust if limit is exceeded
            if (endPage > pageCount) {
              endPage = pageCount;
              startPage = endPage - maxSize + 1;
            }
          }

          // Add page number links
          for (var number = startPage; number <= endPage; number++) {
            var page = makePage(number, number, false);
            pages.push(page);
          }

          // Add previous & next links
          var previousPage = makePage('<', $scope.page - 1, !hasPrevious());
          pages.unshift(previousPage);

          var nextPage = makePage('>', $scope.page + 1, !hasNext());
          pages.push(nextPage);

          $scope.pages = pages;
        }

        $scope.$watch('total', updatePages);
        $scope.$watch('page', updatePages);
      }
    }
  }]);
})();
