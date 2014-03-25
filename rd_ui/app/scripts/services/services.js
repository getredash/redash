(function() {
  'use strict'

  function KeyboardShortcuts() {
    this.bind = function bind(keymap) {
      _.forEach(keymap, function(fn, key) {
        Mousetrap.bindGlobal(key, function(e) {
            e.preventDefault();
            fn();
        });
      });

    }

    this.unbind = function unbind(keymap) {
      _.forEach(keymap, function(fn, key) {
        Mousetrap.unbind(key);
      });
    }
  }

  function Navigation($window, $rootScope) {
    var

    dirtyChecks = [],

    unloadMessage = "You will lose your changes if you leave",
    confirmMessage = unloadMessage + "\n\nAre you sure you want to leave this page?";

    function isDirty() {
      return _.some(dirtyChecks, function(fn) {
        return fn();
      });
    }

    $window.onbeforeunload = function() {
        return isDirty() ? unloadMessage : null;
    }

    $rootScope.$on('$locationChangeStart', function(event, next, current) {
      console.log('evme', 'locationChangeStart');
      if (next.split("#")[0] == current.split("#")[0]) {
        return;
      }

      if (isDirty()) {
        if (confirm(confirmMessage)) {
          dirtyChecks = [];
        } else {
          event.preventDefault();
        }
      }
    });

    $rootScope.$on('$destroy', function() {
        console.log('evme', 'rootScope destroy');
        $window.onbeforeunload = _onbeforeunload;
    });

    // register a function that if returns true,
    // will trigger unsaved changes alert
    this.addWatch = function(fn) {
      dirtyChecks.push(fn);
    }
  }

  angular.module('redash.services', [])
    .service('KeyboardShortcuts', [KeyboardShortcuts])
    .service('Navigation', ['$window', '$rootScope', Navigation])
})();