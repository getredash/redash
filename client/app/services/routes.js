import { isString, filter, map } from "lodash";

class Routes {
  _routes = [];

  items = [];

  _updateItems() {
    this.items = map(this._routes, ({ route }) => route);
  }

  register = (key, route) => {
    key = isString(key) ? key : null;
    this.unregister(key);
    this._routes = [...this._routes, { key, route }];
    this._updateItems();
  };

  unregister = key => {
    if (isString(key)) {
      this._routes = filter(this._routes, item => item.key !== key);
      this._updateItems();
    }
  };
}

export default new Routes();
