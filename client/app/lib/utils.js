import { isFunction, each, extend } from 'lodash';

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
