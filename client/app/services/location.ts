import { isNil, isUndefined, isFunction, isObject, trimStart, mapValues, omitBy, extend } from "lodash";
import qs from "query-string";
import { createBrowserHistory } from "history";
const history = createBrowserHistory();
function normalizeLocation(rawLocation: any) {
    const { pathname, search, hash } = rawLocation;
    const result = {};
    (result as any).path = pathname;
    (result as any).search = mapValues(qs.parse(search), value => (isNil(value) ? true : value));
    (result as any).hash = trimStart(hash, "#");
    (result as any).url = `${pathname}${search}${hash}`;
    return result;
}
const location = {
    listen(handler: any) {
        if (isFunction(handler)) {
            return history.listen((unused, action) => handler(location, action));
        }
        else {
            return () => { };
        }
    },
    confirmChange(handler: any) {
        if (isFunction(handler)) {
            return history.block(nextLocation => {
                return handler(normalizeLocation(nextLocation), location);
            });
        }
        else {
            return () => { };
        }
    },
    update(newLocation: any, replace = false) {
        if (isObject(newLocation)) {
            // remap fields and remove undefined ones
            newLocation = omitBy({
                pathname: (newLocation as any).path,
                search: (newLocation as any).search,
                hash: (newLocation as any).hash,
            }, isUndefined);
            // keep existing fields (!)
            newLocation = extend({
                pathname: location.path,
                search: location.search,
                hash: location.hash,
            }, newLocation);
            // serialize search and keep existing search parameters (!)
            if (isObject(newLocation.search)) {
                newLocation.search = omitBy(extend({}, location.search, newLocation.search), isNil);
                newLocation.search = mapValues(newLocation.search, value => (value === true ? null : value));
                newLocation.search = qs.stringify(newLocation.search);
            }
        }
        if (replace) {
            history.replace(newLocation);
        }
        else {
            history.push(newLocation);
        }
    },
    url: undefined,
    path: undefined,
    setPath(path: any, replace = false) {
        location.update({ path }, replace);
    },
    search: undefined,
    setSearch(search: any, replace = false) {
        location.update({ search }, replace);
    },
    hash: undefined,
    setHash(hash: any, replace = false) {
        location.update({ hash }, replace);
    },
};
function locationChanged() {
    extend(location, normalizeLocation(history.location));
}
history.listen(locationChanged);
locationChanged(); // init service
export default location;
