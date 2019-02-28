import { isFunction, extend, omit, sortBy, startsWith } from 'lodash';

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
    return startsWith(path, this.pathPrefix);
  }
}

class SettingsMenu {
  constructor() {
    this.items = [];
  }

  add(item) {
    this.items.push(new SettingsMenuItem(item));
    this.items = sortBy(this.items, 'order');
  }
}

export default new SettingsMenu();
