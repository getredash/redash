import { each, filter, map, toLower, toString, trim, upperFirst, without } from "lodash";
import Mousetrap from "mousetrap";
import "mousetrap/plugins/global-bind/mousetrap-global-bind";

const modKey = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl";

export function humanReadableShortcut(shortcut, limit = Infinity) {
  const modifiers = {
    mod: upperFirst(modKey),
  };

  shortcut = toLower(toString(shortcut));
  shortcut = filter(map(shortcut.split(","), trim), s => s !== "").slice(0, limit);
  shortcut = map(shortcut, sc => {
    sc = filter(map(sc.split("+")), s => s !== "");
    return map(sc, s => modifiers[s] || upperFirst(s)).join(" + ");
  }).join(", ");

  return shortcut !== "" ? shortcut : null;
}

const handlers = {};

function onShortcut(event, shortcut) {
  event.preventDefault();
  event.retunValue = false;
  each(handlers[shortcut], fn => fn());
}

const KeyboardShortcuts = {
  modKey,

  bind: keymap => {
    each(keymap, (fn, key) => {
      const keys = key
        .toLowerCase()
        .split(",")
        .map(trim);
      each(keys, k => {
        handlers[k] = [...without(handlers[k], fn), fn];
        Mousetrap.bindGlobal(k, onShortcut);
      });
    });
  },

  unbind: keymap => {
    each(keymap, (fn, key) => {
      const keys = key
        .toLowerCase()
        .split(",")
        .map(trim);
      each(keys, k => {
        handlers[k] = without(handlers[k], fn);
        if (handlers[k].length === 0) {
          handlers[k] = undefined;
          Mousetrap.unbind(k);
        }
      });
    });
  },
};

export default KeyboardShortcuts;
