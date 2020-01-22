import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Auth } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";
import ApplicationHeader from "./ApplicationHeader";
import ErrorMessage from "./ErrorMessage";

export default function AuthenticatedPageWrapper({ bodyClass, children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!Auth.isAuthenticated());

  useEffect(() => {
    let isCancelled = false;
    Promise.all([Auth.requireSession(), organizationStatus.refresh()])
      .then(() => {
        if (!isCancelled) {
          setIsAuthenticated(!!Auth.isAuthenticated());
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
  }, []);

  useEffect(() => {
    if (bodyClass) {
      document.body.classList.toggle(bodyClass, true);
      return () => {
        document.body.classList.toggle(bodyClass, false);
      };
    }
  }, [bodyClass]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ApplicationHeader />
      <ErrorBoundary renderError={error => <ErrorMessage error={error} />}>{children}</ErrorBoundary>
    </>
  );
}

AuthenticatedPageWrapper.propTypes = {
  bodyClass: PropTypes.string,
  children: PropTypes.node,
};

AuthenticatedPageWrapper.defaultProps = {
  bodyClass: null,
  children: null,
};
