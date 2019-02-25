import { isFunction, isObject, cloneDeep, each, extend } from 'lodash';

export function routesToAngularRoutes(routes, template) {
  const result = {};
  template = extend({}, template); // convert to object
  each(routes, ({ path, title, key }) => {
    result[path] = extend({
      title,
      // keep `resolve` from `template` (if exists)
      resolve: extend({
        currentPage: () => key,
      }, template.resolve),
    }, template);
  });
  return result;
}

function doCancelEvent(event) {
  event.stopPropagation();
  event.preventDefault();
}

export function cancelEvent(handler) {
  if (isFunction(handler)) {
    return (event, ...rest) => {
      doCancelEvent(event);
      return handler(...rest);
    };
  }
  return doCancelEvent;
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

export function createPromiseHandler(toPromise, onResolved, onRejected = null) {
  let lastValue = null;
  let isCancelled = false;

  function handle(value) {
    if (value !== lastValue) {
      lastValue = value;
      toPromise(value)
        .then((result) => {
          if (!isCancelled && (lastValue === value) && isFunction(onResolved)) {
            onResolved(result);
          }
        })
        .catch((error) => {
          if (!isCancelled && (lastValue === value) && isFunction(onRejected)) {
            onRejected(error);
          }
        });
    }
  }

  handle.cancel = () => {
    isCancelled = true;
  };

  return handle;
}
