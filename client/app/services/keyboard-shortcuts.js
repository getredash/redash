import { each } from 'underscore';
import Mousetrap from 'mousetrap';
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';


function KeyboardShortcuts() {
  this.bind = function bind(keymap) {
    each(keymap, (fn, key) => {
      Mousetrap.bindGlobal(key, (e) => {
        e.preventDefault();
        fn();
      });
    });
  };

  this.unbind = function unbind(keymap) {
    each(keymap, (fn, key) => {
      Mousetrap.unbind(key);
    });
  };
}

export default function init(ngModule) {
  ngModule.service('KeyboardShortcuts', KeyboardShortcuts);
}
