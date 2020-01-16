import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Auth } from "@/services/auth";

export default function SignedOutPageWrapper({ apiKey, children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  return children;
}

SignedOutPageWrapper.propTypes = {
  apiKey: PropTypes.string.isRequired,
  children: PropTypes.node,
};

SignedOutPageWrapper.defaultProps = {
  children: null,
};
