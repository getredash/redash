import { each } from 'underscore';
import Mousetrap from 'mousetrap';

function KeyboardShortcuts() {
  this.bind = function bind(keymap) {
    each(keymap, (fn, key) => {
      Mousetrap.bind(key, (e) => {
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

export default function (ngModule) {
  ngModule.service('KeyboardShortcuts', KeyboardShortcuts);
}
