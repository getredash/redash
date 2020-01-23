import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ErrorBoundary, { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { Auth } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";
import ApplicationHeader from "./ApplicationHeader";
import ErrorMessage from "./ErrorMessage";

// This wrapper modifies `route.render` function and instead of passing `currentRoute` passes an object
// that contains:
// - `currentRoute.routeParams`
// - `pageTitle` field which is equal to `currentRoute.title`
// - `onError` field which is a `handleError` method of nearest error boundary

function UserSessionWrapper({ bodyClass, currentRoute, renderChildren }) {
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
    <React.Fragment>
      <ApplicationHeader />
      <React.Fragment key={currentRoute.key}>
        <ErrorBoundary renderError={error => <ErrorMessage error={error} />}>
          <ErrorBoundaryContext.Consumer>
            {({ handleError }) =>
              renderChildren({ ...currentRoute.routeParams, pageTitle: currentRoute.title, onError: handleError })
            }
          </ErrorBoundaryContext.Consumer>
        </ErrorBoundary>
      </React.Fragment>
    </React.Fragment>
  );
}

UserSessionWrapper.propTypes = {
  bodyClass: PropTypes.string,
  renderChildren: PropTypes.func,
};

UserSessionWrapper.defaultProps = {
  bodyClass: null,
  renderChildren: () => null,
};

export default function routeWithUserSession({ render, bodyClass, ...rest }) {
  return {
    ...rest,
    render: currentRoute => (
      <UserSessionWrapper bodyClass={bodyClass} currentRoute={currentRoute} renderChildren={render} />
    ),
  };
}
