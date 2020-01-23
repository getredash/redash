import React, { useEffect, useState, useContext } from "react";
import PropTypes from "prop-types";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { Auth } from "@/services/auth";

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <React.Fragment key={currentRoute.key}>
      {renderChildren(currentRoute, { apiKey, onError: handleError })}
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
