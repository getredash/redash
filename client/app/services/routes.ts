import { isString, isObject, filter, sortBy } from "lodash";
import React from "react";
import { Context, Route as UniversalRouterRoute } from "universal-router";
import pathToRegexp from "path-to-regexp";

export interface CurrentRoute<P> {
  id: string | null;
  key?: string;
  title: string;
  routeParams: P;
}

export interface RedashRoute<P = {}, C extends Context = Context, R = any> extends UniversalRouterRoute<C, R> {
  path: string; // we don't use other UniversalRouterRoute options, path should be available and should be a string
  key?: string; // generated in Router.jsx
  title: string;
  render?: (currentRoute: CurrentRoute<P>) => React.ReactNode;
  getApiKey?: () => string;
}

interface RouteItem extends RedashRoute<any> {
  id: string | null;
}

function getRouteParamsCount(path: string) {
  const tokens = pathToRegexp.parse(path);
  return filter(tokens, isObject).length;
}

class Routes {
  _items: RouteItem[] = [];
  _sorted = false;

  get items(): RouteItem[] {
    if (!this._sorted) {
      this._items = sortBy(this._items, [
        item => getRouteParamsCount(item.path), // simple definitions first, with more params - last
        item => -item.path.length, // longer first
        item => item.path, // if same type and length - sort alphabetically
      ]);
      this._sorted = true;
    }
    return this._items;
  }

  public register<P>(id: string, route: RedashRoute<P>) {
    const idOrNull = isString(id) ? id : null;
    this.unregister(idOrNull);
    if (isObject(route)) {
      this._items = [...this.items, { ...route, id: idOrNull }];
      this._sorted = false;
    }
  }

  public unregister(id: string | null) {
    if (isString(id)) {
      // removing item does not break their order (if already sorted)
      this._items = filter(this.items, item => item.id !== id);
    }
  }
}

export default new Routes();
