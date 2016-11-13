(function () {
  'use strict';

  var directives = angular.module('redash.directives', []);

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

})();
