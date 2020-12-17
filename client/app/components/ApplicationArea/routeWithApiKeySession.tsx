import React, { useEffect, useState, useContext } from "react";
import { ErrorBoundaryContext } from "@redash/viz/lib/components/ErrorBoundary";
import { Auth, clientConfig } from "@/services/auth";
type OwnProps = {
    apiKey: string;
    renderChildren?: (...args: any[]) => any;
};
type Props = OwnProps & typeof ApiKeySessionWrapper.defaultProps;
// This wrapper modifies `route.render` function and instead of passing `currentRoute` passes an object
// that contains:
// - `currentRoute.routeParams`
// - `pageTitle` field which is equal to `currentRoute.title`
// - `onError` field which is a `handleError` method of nearest error boundary
// - `apiKey` field
// @ts-expect-error ts-migrate(2339) FIXME: Property 'currentRoute' does not exist on type 'Pr... Remove this comment to see the full error message
function ApiKeySessionWrapper({ apiKey, currentRoute, renderChildren }: Props) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { handleError } = useContext(ErrorBoundaryContext);
    useEffect(() => {
        let isCancelled = false;
        Auth.setApiKey(apiKey);
        Auth.loadConfig()
            .then(() => {
            if (!isCancelled) {
                setIsAuthenticated(true);
            }
        })
            .catch(() => {
            if (!isCancelled) {
                setIsAuthenticated(false);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [apiKey]);
    if (!isAuthenticated || (clientConfig as any).disablePublicUrls) {
        return null;
    }
    return (<React.Fragment key={currentRoute.key}>
      {renderChildren({ ...currentRoute.routeParams, pageTitle: currentRoute.title, onError: handleError, apiKey })}
    </React.Fragment>);
}
ApiKeySessionWrapper.defaultProps = {
    renderChildren: () => null,
};
export default function routeWithApiKeySession({ render, getApiKey, ...rest }: any) {
    return {
        ...rest,
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ apiKey: any; currentRoute: any; renderChil... Remove this comment to see the full error message
        render: (currentRoute: any) => <ApiKeySessionWrapper apiKey={getApiKey(currentRoute)} currentRoute={currentRoute} renderChildren={render}/>,
    };
}
