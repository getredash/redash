import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ErrorBoundary, { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { Auth } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";
import ApplicationHeader from "./ApplicationHeader";
import ErrorMessage from "./ErrorMessage";

export default function withUserSession(WrappedComponent) {
  function UserSessionWrapper({ bodyClass, ...props }) {
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
        <ErrorBoundary renderError={error => <ErrorMessage error={error} />}>
          <ErrorBoundaryContext.Consumer>
            {({ handleError }) => <WrappedComponent onError={handleError} {...props} />}
          </ErrorBoundaryContext.Consumer>
        </ErrorBoundary>
      </>
    );
  }

  UserSessionWrapper.propTypes = {
    bodyClass: PropTypes.string,
    children: PropTypes.node,
  };

  UserSessionWrapper.defaultProps = {
    bodyClass: null,
    children: null,
  };

  return UserSessionWrapper;
}
