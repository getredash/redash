import { each, filter, map, toLower, toString, trim, upperFirst, without } from "lodash";
import Mousetrap from "mousetrap";
import "mousetrap/plugins/global-bind/mousetrap-global-bind";

const modKey = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl";
const altKey = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "Option" : "Alt";

export function humanReadableShortcut(shortcut: any, limit = Infinity) {
  const modifiers = {
    mod: upperFirst(modKey),
    alt: upperFirst(altKey),
  };

  shortcut = toLower(toString(shortcut));
  shortcut = filter(map(shortcut.split(","), trim), s => s !== "").slice(0, limit);
  shortcut = map(shortcut, sc => {
    sc = filter(map(sc.split("+")), s => s !== "");
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    return map(sc, s => modifiers[s] || upperFirst(s)).join(" + ");
  }).join(", ");

  return shortcut !== "" ? shortcut : null;
}

const handlers = {};

function onShortcut(event: any, shortcut: any) {
  event.preventDefault();
  event.retunValue = false;
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  each(handlers[shortcut], fn => fn());
}

const KeyboardShortcuts = {
  modKey,
  altKey,

  bind: (keymap: any) => {
    each(keymap, (fn, key) => {
      const keys = key
        .toLowerCase()
        .split(",")
        .map(trim);
      each(keys, k => {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        handlers[k] = [...without(handlers[k], fn), fn];
        Mousetrap.bindGlobal(k, onShortcut);
      });
    });
  },

  unbind: (keymap: any) => {
    each(keymap, (fn, key) => {
      const keys = key
        .toLowerCase()
        .split(",")
        .map(trim);
      each(keys, k => {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        handlers[k] = without(handlers[k], fn);
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (handlers[k].length === 0) {
          // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          handlers[k] = undefined;
          Mousetrap.unbind(k);
        }
      });
    });
  },
};

export default KeyboardShortcuts;
