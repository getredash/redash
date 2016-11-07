(function () {
  'use strict'

  function KeyboardShortcuts() {
    this.bind = function bind(keymap) {
      _.forEach(keymap, function (fn, key) {
        Mousetrap.bindGlobal(key, function (e) {
          e.preventDefault();
          fn();
        });
      });

    }

    this.unbind = function unbind(keymap) {
      _.forEach(keymap, function (fn, key) {
        Mousetrap.unbind(key);
      });
    }
  }

  angular.module('redash.services', [])
      .service('KeyboardShortcuts', [KeyboardShortcuts])
})();
