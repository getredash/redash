import { isFunction, startsWith, trimStart, trimEnd } from "lodash";
import React, { useState, useEffect, useRef, useContext } from "react";
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
export function stripBase(href: any) {
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
type OwnProps = {
    routes?: {
        path: string;
        render?: (...args: any[]) => any;
        resolve?: {
            [key: string]: any;
        };
    }[];
    onRouteChange?: (...args: any[]) => any;
};
type Props = OwnProps & typeof Router.defaultProps;
export default function Router({ routes, onRouteChange }: Props) {
    const [currentRoute, setCurrentRoute] = useState(null);
    const currentPathRef = useRef(null);
    const errorHandlerRef = useRef();
    useEffect(() => {
        let isAbandoned = false;
        const router = new UniversalRouter(routes, {
            resolveRoute({ route }, routeParams) {
                if (isFunction((route as any).render)) {
                    return { ...route, routeParams };
                }
            },
        });
        function resolve(action: any) {
            if (!isAbandoned) {
                if (errorHandlerRef.current) {
                    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
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
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null'.
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
                            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ render: (currentRoute: any) =>... Remove this comment to see the full error message
                            render: (currentRoute: any) => <ErrorMessage {...currentRoute.routeParams}/>,
                            routeParams: { error },
                        });
                    }
                });
            }
        }
        resolve("PUSH");
        const unlisten = location.listen((unused: any, action: any) => resolve(action));
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
    return (<CurrentRouteContext.Provider value={currentRoute}>
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <ErrorBoundary ref={errorHandlerRef} renderError={(error: any) => <ErrorMessage error={error}/>}>
        {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
        {currentRoute.render(currentRoute)}
      </ErrorBoundary>
    </CurrentRouteContext.Provider>);
}
Router.defaultProps = {
    routes: [],
    onRouteChange: () => { },
};
