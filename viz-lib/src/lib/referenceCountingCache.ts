import { each, debounce } from "lodash";

export default function createReferenceCountingCache({ cleanupDelay = 2000 } = {}) {
  const items = {};

  const cleanup = debounce(() => {
    each(items, (item, key) => {
      if (item.refCount <= 0) {
        delete items[key];
      }
    });
  }, cleanupDelay);

  function get(key, getter) {
    if (!items[key]) {
      items[key] = {
        value: getter(),
        refCount: 0,
      };
    }
    const item = items[key];
    item.refCount += 1;
    return item.value;
  }

  function release(key) {
    if (items[key]) {
      const item = items[key];
      if (item.refCount > 0) {
        item.refCount -= 1;
        if (item.refCount <= 0) {
          cleanup();
        }
      }
    }
  }

  return { get, release };
}
