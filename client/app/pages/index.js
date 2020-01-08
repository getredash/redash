import { extend, map, flatten } from "lodash";
import { Auth } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";

import homeRoutes from "./home/Home";
import queriesListRoutes from "./queries-list/QueriesList";

function prepareRoutes(routes) {
  const resolveExtra = {
    __auth: () => Auth.requireSession(),
    __organizationStatus: () => organizationStatus.refresh(),
  };

  return map(flatten(routes), route => {
    route = extend(route, {
      authenticated: route.authenticated !== false, // could be set to `false` do disable auth
    });
    if (route.authenticated) {
      route.resolve = extend({}, route.resolve, resolveExtra);
    }
    return route;
  });
}

export default prepareRoutes([
  homeRoutes,
  queriesListRoutes,
]);
