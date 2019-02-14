import { each, extend } from 'lodash';

/* eslint-disable import/prefer-default-export */

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
