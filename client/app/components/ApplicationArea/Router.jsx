import { isFunction, map, fromPairs, extend } from "lodash";
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import UniversalRouter from "universal-router";
import { createBrowserHistory } from "history";

import ErrorMessage from "./ErrorMessage";

const history = createBrowserHistory();

function resolveRouteDependencies(route) {
  return Promise.all(
    map(route.resolve, (value, key) => {
      value = isFunction(value) ? value : value;
      return Promise.resolve(value).then(result => [key, result]);
    })
  ).then(results => {
    route.routeParams = extend(route.routeParams, fromPairs(results));
    delete route.resolve;
    return route;
  });
}

export default function Router({ routes, onRouteChange, ...props }) {
  const [currentRoute, setCurrentRoute] = useState(null);

  useEffect(() => {
    let isAbandoned = false;

    const router = new UniversalRouter(routes, {
      resolveRoute({ route }, routeParams) {
        if (isFunction(route.component)) {
          return {
            Component: route.component,
            routeParams,
            resolve: route.resolve,
          };
        }
      },
    });

    function resolve(pathname) {
      if (!isAbandoned) {
        router
          .resolve({ pathname })
          .then(route => {
            return isAbandoned ? null : resolveRouteDependencies(route.resolve);
          })
          .then(route => {
            if (route) {
              setCurrentRoute(route);
            }
          })
          .catch(error => {
            if (!isAbandoned) {
              setCurrentRoute({
                Component: ErrorMessage,
                routeParams: { error },
              });
            }
          });
      }
    }

    resolve(history.location.pathname);

    const unlisten = history.listen(location => {
      resolve(location.pathname);
    });

    return () => {
      isAbandoned = true;
      unlisten();
    };
  }, [routes]);

  useEffect(() => {
    onRouteChange(currentRoute);
  }, [currentRoute, onRouteChange]);

  if (!currentRoute) {
    return null;
  }
  const { Component, routeParams } = currentRoute;

  return <Component {...props} {...routeParams} />;
}

Router.propTypes = {
  routes: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      component: PropTypes.elementType,
      // Additional props to be injected into route component.
      // Object keys are props names. Object values will become prop values:
      // - if value is a function - it will be called without arguments, and result will be used; otherwise value will be used;
      // - after previous step, if value is a promise - router will wait for it to resolve; resolved value then will be used;
      //   otherwise value will be used directly.
      resolve: PropTypes.arrayOf(PropTypes.any),
    })
  ),
  onRouteChange: PropTypes.func,
};

Router.defaultProps = {
  routes: [],
  onRouteChange: () => {},
};
