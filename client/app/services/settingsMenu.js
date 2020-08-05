import { isString, isObject, isFunction, extend, omit, sortBy, find, filter } from "lodash";
import { stripBase } from "@/components/ApplicationArea/Router";
import { currentUser } from "@/services/auth";

class SettingsMenuItem {
  constructor(menuItem) {
    extend(this, { pathPrefix: `/${menuItem.path}` }, omit(menuItem, ["isActive", "isAvailable"]));
    if (isFunction(menuItem.isActive)) {
      this.isActive = menuItem.isActive;
    }
    if (isFunction(menuItem.isAvailable)) {
      this.isAvailable = menuItem.isAvailable;
    }
  }

  isActive(path) {
    return path.startsWith(this.pathPrefix);
  }

  isAvailable() {
    return this.permission === undefined || currentUser.hasPermission(this.permission);
  }
}

class SettingsMenu {
  items = [];

  add(id, item) {
    id = isString(id) ? id : null;
    this.remove(id);
    if (isObject(item)) {
      this.items.push(new SettingsMenuItem({ ...item, id }));
      this.items = sortBy(this.items, "order");
    }
  }

  remove(id) {
    if (isString(id)) {
      this.items = filter(this.items, item => item.id !== id);
      // removing item does not change order of other items, so no need to sort
    }
  }

  getAvailableItems() {
    return filter(this.items, item => item.isAvailable());
  }

  getActiveItem(path) {
    const strippedPath = stripBase(path);
    return find(this.items, item => item.isActive(strippedPath));
  }
}

export default new SettingsMenu();
