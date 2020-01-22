import React, { useEffect, useState, useContext } from "react";
import PropTypes from "prop-types";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { Auth } from "@/services/auth";

export default function withApiKeySession(WrappedComponent) {
  function ApiKeySessionWrapper({ apiKey, ...props }) {
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

    return <WrappedComponent onError={handleError} apiKey={apiKey} {...props} />;
  }

  ApiKeySessionWrapper.propTypes = {
    apiKey: PropTypes.string.isRequired,
  };

  return ApiKeySessionWrapper;
}
