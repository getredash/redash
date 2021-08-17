import { isFunction, startsWith, trimStart, trimEnd } from "lodash";
import React, { useState, useEffect, useRef, useContext } from "react";
import PropTypes from "prop-types";
import UniversalRouter from "universal-router";
import ErrorBoundary from "@redash/viz/lib/components/ErrorBoundary";
import location from "@/services/location";
import url from "@/services/url";

import ErrorMessage from "./ErrorMessage";

function generateRouteKey() {
  return Math.random()
    .toString(32)
    .substr(2);
}

export const CurrentRouteContext = React.createContext(null);

export function useCurrentRoute() {
  return useContext(CurrentRouteContext);
}

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

export default function Router({ routes, onRouteChange }) {
  const [currentRoute, setCurrentRoute] = useState(null);

  const currentPathRef = useRef(null);
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

    function resolve(action) {
      if (!isAbandoned) {
        if (errorHandlerRef.current) {
          errorHandlerRef.current.reset();
        }

        const pathname = stripBase(location.path) || "/";

        // This is a optimization for route resolver: if current route was already resolved
        // from this path - do nothing. It also prevents router from using outdated route in a case
        // when user navigated to another path while current one was still resolving.
        // Note: this lock uses only `path` fragment of URL to distinguish routes because currently
        // all pages depend only on this fragment and handle search/hash on their own. If router
        // should reload page on search/hash change - this fragment (and few checks below) should be updated
        if (pathname === currentPathRef.current) {
          return;
        }
        currentPathRef.current = pathname;

        // Don't reload controller if URL was replaced
        if (action === "REPLACE") {
          return;
        }

        router
          .resolve({ pathname })
          .then(route => {
            if (!isAbandoned && currentPathRef.current === pathname) {
              setCurrentRoute({ ...route, key: generateRouteKey() });
            }
          })
          .catch(error => {
            if (!isAbandoned && currentPathRef.current === pathname) {
              setCurrentRoute({
                render: currentRoute => <ErrorMessage {...currentRoute.routeParams} />,
                routeParams: { error },
              });
            }
          });
      }
    }

    resolve("PUSH");

    const unlisten = location.listen((unused, action) => resolve(action));

    return () => {
      isAbandoned = true;
      currentPathRef.current = null;
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
    <CurrentRouteContext.Provider value={currentRoute}>
      <ErrorBoundary ref={errorHandlerRef} renderError={error => <ErrorMessage error={error} />}>
        {currentRoute.render(currentRoute)}
      </ErrorBoundary>
    </CurrentRouteContext.Provider>
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
