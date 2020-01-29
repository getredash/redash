import { each } from "lodash";

export default function createReferenceCountingCache({ cleanupDelay = 2000 } = {}) {
  const items = {};

  function cleanup() {
    setTimeout(() => {
      each(items, (item, key) => {
        if (item.refCount <= 0) {
          delete items[key];
        }
      });
    }, cleanupDelay);
  }

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
        cleanup();
      }
    }
  }

  return { get, release };
}
