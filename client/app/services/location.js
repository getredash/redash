import { isNil, isFunction, isObject, trimStart, mapValues, omitBy, extend } from "lodash";
import qs from "query-string";
import { createBrowserHistory } from "history";

const history = createBrowserHistory();

const location = {
  listen(handler) {
    if (isFunction(handler)) {
      return history.listen(() => handler(location));
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
  const { pathname, search, hash } = history.location;

  location.path = pathname;
  location.search = mapValues(qs.parse(search), value => isNil(value) ? true : value);
  location.hash = trimStart(hash, "#");

  return `${pathname}${search}${hash}`;
}

history.listen(locationChanged);
locationChanged(); // init service

export default location;
