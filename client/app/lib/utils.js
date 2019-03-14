import { each, extend } from 'lodash';

// eslint-disable-next-line import/prefer-default-export
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
