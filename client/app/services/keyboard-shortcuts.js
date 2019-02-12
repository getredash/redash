import { each, trim, without } from 'lodash';
import Mousetrap from 'mousetrap';
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

export let KeyboardShortcuts = null; // eslint-disable-line import/no-mutable-exports

const handlers = {};

function onShortcut(event, shortcut) {
  event.preventDefault();
  event.retunValue = false;
  each(handlers[shortcut], fn => fn());
}

function KeyboardShortcutsService() {
  this.modKey = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'Cmd' : 'Ctrl';

  this.bind = function bind(keymap) {
    each(keymap, (fn, key) => {
      const keys = key
        .toLowerCase()
        .split(',')
        .map(trim);
      each(keys, (k) => {
        handlers[k] = [...without(handlers[k], fn), fn];
        Mousetrap.bindGlobal(k, onShortcut);
      });
    });
  };

  this.unbind = function unbind(keymap) {
    each(keymap, (fn, key) => {
      const keys = key
        .toLowerCase()
        .split(',')
        .map(trim);
      each(keys, (k) => {
        handlers[k] = without(handlers[k], fn);
        if (handlers[k].length === 0) {
          handlers[k] = undefined;
          Mousetrap.unbind(k);
        }
      });
    });
  };
}

export default function init(ngModule) {
  ngModule.service('KeyboardShortcuts', KeyboardShortcutsService);

  ngModule.run(($injector) => {
    KeyboardShortcuts = $injector.get('KeyboardShortcuts');
  });
}

init.init = true;
