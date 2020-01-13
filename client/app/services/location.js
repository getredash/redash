import { isNil, isFunction, isObject, trimStart, mapValues, omitBy, extend } from "lodash";
import qs from "query-string";
import { createBrowserHistory } from "history";

const history = createBrowserHistory();

function normalizeLocation(rawLocation) {
  const { pathname, search, hash } = rawLocation;
  const result = {};

  result.path = pathname;
  result.search = mapValues(qs.parse(search), value => (isNil(value) ? true : value));
  result.hash = trimStart(hash, "#");
  result.url = `${pathname}${search}${hash}`;

  return result;
}

const location = {
  listen(handler) {
    if (isFunction(handler)) {
      return history.listen(() => handler(location));
    } else {
      return () => {};
    }
  },

  confirmChange(handler) {
    if (isFunction(handler)) {
      return history.block(nextLocation => {
        return handler(normalizeLocation(nextLocation), location);
      });
    } else {
      return () => {};
    }
  },

  update(newLocation, replace = false) {
    if (replace) {
      history.replace(newLocation);
    } else {
      history.push(newLocation);
    }
  },

  url: undefined,

  path: undefined,
  setPath(path, replace = false) {
    location.update({ path }, replace);
  },

  search: undefined,
  setSearch(search, replace = false) {
    if (isObject(search)) {
      search = omitBy(extend({}, location.search, search), isNil);
      search = mapValues(search, value => (value === true ? null : value));
      search = qs.stringify(search);
    }
    location.update({ search }, replace);
  },

  hash: undefined,
  setHash(hash, replace = false) {
    location.update({ hash }, replace);
  },
};

function locationChanged() {
  extend(location, normalizeLocation(history.location));
}

history.listen(locationChanged);
locationChanged(); // init service

export default location;
