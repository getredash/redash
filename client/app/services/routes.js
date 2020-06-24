import { isString, isObject, filter } from "lodash";

class Routes {
  items = [];

  register(id, route) {
    id = isString(id) ? id : null;
    this.unregister(id);
    if (isObject(route)) {
      this.items = [...this.items, { ...route, id }];
    }
  }

  unregister(id) {
    if (isString(id)) {
      this.items = filter(this.items, item => item.id !== id);
    }
  }
}

export default new Routes();
