(function() {
    'use strict';

    var directives = angular.module('redash.directives', []);

    directives.directive('alertUnsavedChanges', ['$window', function($window) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                'isDirty': '='
            },
            link: function($scope) {
                var

                unloadMessage = "You will lose your changes if you leave",
                confirmMessage = unloadMessage + "\n\nAre you sure you want to leave this page?",

                // store original handler (if any)
                _onbeforeunload = $window.onbeforeunload;

                $window.onbeforeunload = function() {
                    return $scope.isDirty ? unloadMessage : null;
                }

                $scope.$on('$locationChangeStart', function(event, next, current) {
                  if (next.split("#")[0] == current.split("#")[0]) {
                    return;
                  }

                  if ($scope.isDirty && !confirm(confirmMessage)) {
                    event.preventDefault();
                  }
                });

                $scope.$on('$destroy', function() {
                    $window.onbeforeunload = _onbeforeunload;
                });
            }
        }
    }]);

    directives.directive('rdTab', function() {
        return {
            restrict: 'E',
            scope: {
                'tabId': '@',
                'name': '@'
            },
            transclude: true,
            template: '<li class="rd-tab" ng-class="{active: tabId==selectedTab}"><a href="#{{tabId}}">{{name}}<span ng-transclude></span></a></li>',
            replace: true,
            link: function(scope) {
                scope.$watch(function(){return scope.$parent.selectedTab}, function(tab) {
                    scope.selectedTab = tab;
                });
            }
        }
    });

    directives.directive('rdTabs', ['$location', function($location) {
        return {
            restrict: 'E',
            scope: {
                tabsCollection: '=',
                selectedTab: '='
            },
            template: '<ul class="nav nav-tabs"><li ng-class="{active: tab==selectedTab}" ng-repeat="tab in tabsCollection"><a href="#{{tab.key}}">{{tab.name}}</a></li></ul>',
            replace: true,
            link: function($scope, element, attrs) {
                $scope.selectTab = function(tabKey) {
                    $scope.selectedTab  = _.find($scope.tabsCollection, function(tab) { return tab.key == tabKey; });
                }

                $scope.$watch(function() { return $location.hash()}, function(hash) {
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
                done: '='
            },
            template: function(tElement, tAttrs) {
                var elType = tAttrs.editor || 'input';
                var placeholder = tAttrs.placeholder || 'Click to edit';
                return '<span ng-click="editable && edit()" ng-bind="value" ng-class="{editable: editable}"></span>' +
                       '<span ng-click="editable && edit()" ng-show="editable && !value" ng-class="{editable: editable}">' + placeholder + '</span>' +
                       '<{elType} ng-model="value" class="rd-form-control"></{elType}>'.replace('{elType}', elType);
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

                $(inputElement).keydown(function(e) {
                    // 'return' or 'enter' key pressed
                    // allow 'shift' to break lines
                    if (e.which === 13 && !e.shiftKey) {
                        save();
                    } else if (e.which === 27) {
                        $scope.value = $scope.oldValue;
                        $scope.$apply(function() {
                            $(inputElement[0]).blur();
                        });
                    }
                }).blur(function() {
                    save();
                });
            }
        };
    });

    // http://stackoverflow.com/a/17904092/1559840
    directives.directive('jsonText', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attr, ngModel) {
              function into(input) {
                return JSON.parse(input);
              }
              function out(data) {
                return JSON.stringify(data, undefined, 2);
              }
              ngModel.$parsers.push(into);
              ngModel.$formatters.push(out);

              scope.$watch(attr.ngModel, function(newValue) {
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
            controller: ['$scope' ,function ($scope) {
                $scope.currentTime = "00:00:00";

                // We're using setInterval directly instead of $timeout, to avoid using $apply, to
                // prevent the digest loop being run every second.
                var currentTimer = setInterval(function() {
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

    directives.directive('rdTimeAgo', function() {
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
})();
