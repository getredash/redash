import React, { useEffect, useState, useContext } from "react";
import PropTypes from "prop-types";
import { ErrorBoundaryContext } from "@redash/viz/lib/components/ErrorBoundary";
import { Auth, clientConfig } from "@/services/auth";

// This wrapper modifies `route.render` function and instead of passing `currentRoute` passes an object
// that contains:
// - `currentRoute.routeParams`
// - `pageTitle` field which is equal to `currentRoute.title`
// - `onError` field which is a `handleError` method of nearest error boundary
// - `apiKey` field

function ApiKeySessionWrapper({ apiKey, currentRoute, renderChildren }) {
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

  if (!isAuthenticated || clientConfig.disablePublicUrls) {
    return null;
  }

  return (
    <React.Fragment key={currentRoute.key}>
      {renderChildren({ ...currentRoute.routeParams, pageTitle: currentRoute.title, onError: handleError, apiKey })}
    </React.Fragment>
  );
}

ApiKeySessionWrapper.propTypes = {
  apiKey: PropTypes.string.isRequired,
  renderChildren: PropTypes.func,
};

ApiKeySessionWrapper.defaultProps = {
  renderChildren: () => null,
};

export default function routeWithApiKeySession({ render, getApiKey, ...rest }) {
  return {
    ...rest,
    render: currentRoute => (
      <ApiKeySessionWrapper apiKey={getApiKey(currentRoute)} currentRoute={currentRoute} renderChildren={render} />
    ),
  };
}
