import { isFunction, each, extend } from 'lodash';

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
