import { isFunction, map, fromPairs, extend, startsWith, trimStart, trimEnd } from "lodash";
import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import UniversalRouter from "universal-router";
import ErrorBoundary from "@/components/ErrorBoundary";
import location from "@/services/location";
import url from "@/services/url";

import ErrorMessage from "./ErrorMessage";

export function stripBase(href) {
  // Resolve provided link and '' (root) relative to document's base.
  // If provided href is not related to current document (does not
  // start with resolved root) - return false. Otherwise
  // strip root and return relative url.

  const baseHref = trimEnd(url.normalize(""), "/") + "/";
  href = url.normalize(href);

  if (startsWith(href, baseHref)) {
    return "/" + trimStart(href.substr(baseHref.length), "/");
  }

  return false;
}

function resolveRouteDependencies(route) {
  return Promise.all(
    map(route.resolve, (value, key) => {
      value = isFunction(value) ? value(route.routeParams, route, location) : value;
      return Promise.resolve(value).then(result => [key, result]);
    })
  ).then(results => {
    route.routeParams = extend(route.routeParams, fromPairs(results));
    return route;
  });
}

export default function Router({ routes, onRouteChange }) {
  const [currentRoute, setCurrentRoute] = useState(null);

  const errorHandlerRef = useRef();

  useEffect(() => {
    let isAbandoned = false;

    const router = new UniversalRouter(routes, {
      resolveRoute({ route }, routeParams) {
        if (isFunction(route.render)) {
          return { ...route, routeParams };
        }
      },
    });

    function resolve() {
      if (!isAbandoned) {
        if (errorHandlerRef.current) {
          errorHandlerRef.current.reset();
        }

        const pathname = stripBase(location.path);
        router
          .resolve({ pathname })
          .then(route => {
            return isAbandoned ? null : resolveRouteDependencies(route);
          })
          .then(route => {
            if (route) {
              setCurrentRoute(route);
            }
          })
          .catch(error => {
            if (!isAbandoned) {
              if (error.status === 404) {
                // just a rename, original message is "Route not found"
                error = new Error("Page not found");
              }
              setCurrentRoute({
                render: params => <ErrorMessage {...params} />,
                routeParams: { error },
              });
            }
          });
      }
    }

    resolve();

    const unlisten = location.listen(resolve);

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

  return (
    <ErrorBoundary ref={errorHandlerRef} renderError={error => <ErrorMessage error={error} />}>
      {currentRoute.render(currentRoute.routeParams, currentRoute, location)}
    </ErrorBoundary>
  );
}

Router.propTypes = {
  routes: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      render: PropTypes.func, // (routeParams: PropTypes.object; currentRoute; location) => PropTypes.node
      // Additional props to be injected into route component.
      // Object keys are props names. Object values will become prop values:
      // - if value is a function - it will be called without arguments, and result will be used; otherwise value will be used;
      // - after previous step, if value is a promise - router will wait for it to resolve; resolved value then will be used;
      //   otherwise value will be used directly.
      resolve: PropTypes.objectOf(PropTypes.any),
    })
  ),
  onRouteChange: PropTypes.func,
};

Router.defaultProps = {
  routes: [],
  onRouteChange: () => {},
};
