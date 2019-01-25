import { isFunction, extend, omit, sortBy } from 'lodash';

class SettingsMenuItem {
  constructor(menuItem) {
    extend(
      this,
      { pathPrefix: `/${menuItem.path}` },
      omit(menuItem, ['isActive']),
    );
    if (isFunction(menuItem.isActive)) {
      this.isActive = menuItem.isActive;
    }
  }

  isActive(path) {
    return path.startsWith(this.pathPrefix);
  }
}

class SettingsMenu {
  constructor() {
    this._items = [];
    this._dirty = false;
  }

  get items() {
    if (this._dirty) {
      this._items = sortBy(this._items, 'order');
      this._dirty = false;
    }
    return this._items;
  }

  add(item) {
    this._items.push(new SettingsMenuItem(item));
    this._dirty = true;
  }
}

export default new SettingsMenu();
