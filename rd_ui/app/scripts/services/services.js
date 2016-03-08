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

  function Events($http) {
    this.events = [];

    this.post = _.debounce(function() {
      var events = this.events;
      this.events = [];

      $http.post('api/events', events);

    }, 1000);

    this.record = function (user, action, object_type, object_id, additional_properties) {

      var event = {
        "user_id": user.id,
        "action": action,
        "object_type": object_type,
        "object_id": object_id,
        "timestamp": Date.now()/1000.0
      };
      _.extend(event, additional_properties);
      this.events.push(event);

      this.post();
    };
  }

  angular.module('redash.services', [])
      .service('KeyboardShortcuts', [KeyboardShortcuts])
      .service('Events', ['$http', Events])
})();