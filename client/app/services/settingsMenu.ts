import { isString, isObject, isFunction, extend, omit, sortBy, find, filter } from "lodash";
import { stripBase } from "@/components/ApplicationArea/Router";
import { currentUser } from "@/services/auth";

class SettingsMenuItem {
  pathPrefix: any;
  permission: any;
  constructor(menuItem: any) {
    extend(this, { pathPrefix: `/${menuItem.path}` }, omit(menuItem, ["isActive", "isAvailable"]));
    if (isFunction(menuItem.isActive)) {
      this.isActive = menuItem.isActive;
    }
    if (isFunction(menuItem.isAvailable)) {
      this.isAvailable = menuItem.isAvailable;
    }
  }

  isActive(path: any) {
    return path.startsWith(this.pathPrefix);
  }

  isAvailable() {
    return this.permission === undefined || currentUser.hasPermission(this.permission);
  }
}

class SettingsMenu {
  items = [];

  add(id: any, item: any) {
    id = isString(id) ? id : null;
    this.remove(id);
    if (isObject(item)) {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'SettingsMenuItem' is not assigna... Remove this comment to see the full error message
      this.items.push(new SettingsMenuItem({ ...item, id }));
      this.items = sortBy(this.items, "order");
    }
  }

  remove(id: any) {
    if (isString(id)) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
      this.items = filter(this.items, item => item.id !== id);
      // removing item does not change order of other items, so no need to sort
    }
  }

  getAvailableItems() {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isAvailable' does not exist on type 'nev... Remove this comment to see the full error message
    return filter(this.items, item => item.isAvailable());
  }

  getActiveItem(path: any) {
    const strippedPath = stripBase(path);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isActive' does not exist on type 'never'... Remove this comment to see the full error message
    return find(this.items, item => item.isActive(strippedPath));
  }
}

export default new SettingsMenu();
