import { isObject, cloneDeep, each, extend } from 'lodash';

export function routesToAngularRoutes(routes, template) {
  const result = {};
  template = extend({}, template); // convert to object
  each(routes, ({ path, title, key, ...resolve }) => {
    // Convert to functions
    each(resolve, (value, prop) => {
      resolve[prop] = () => value;
    });

    result[path] = {
      ...template,
      title,
      // keep `resolve` from `template` (if exists)
      resolve: {
        ...template.resolve,
        ...resolve,
        currentPage: () => key,
      },
    };
  });
  return result;
}

// ANGULAR_REMOVE_ME
export function cleanAngularProps(value) {
  // remove all props that start with '$$' - that's what `angular.toJson` does
  const omitAngularProps = (obj) => {
    each(obj, (v, k) => {
      if (('' + k).startsWith('$$')) {
        delete obj[k];
      } else {
        obj[k] = isObject(v) ? omitAngularProps(v) : v;
      }
    });
    return obj;
  };

  const result = cloneDeep(value);
  return isObject(result) ? omitAngularProps(result) : result;
}
