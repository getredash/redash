import { isString, isObject, filter, sortBy, some } from "lodash";
import pathToRegexp from "path-to-regexp";

function isSimplePath(path) {
  const tokens = pathToRegexp.parse(path);
  return some(tokens, isObject);
}

class Routes {
  _items = [];
  _sorted = false;

  get items() {
    if (!this._sorted) {
      this._items = sortBy(this._items, [
        item => isSimplePath(item.path), // simple definitions first, with params - last
        item => -item.path.length, // longer first
        item => item.path, // if same type and length - sort alphabetically
      ]);
      this._sorted = true;
    }
    return this._items;
  }

  register(id, route) {
    id = isString(id) ? id : null;
    this.unregister(id);
    if (isObject(route)) {
      this._items = [...this._items, { ...route, id }];
      this._sorted = false;
    }
  }

  unregister(id) {
    if (isString(id)) {
      // removing item does not break their order (if already sorted)
      this._items = filter(this._items, item => item.id !== id);
    }
  }
}

export default new Routes();
