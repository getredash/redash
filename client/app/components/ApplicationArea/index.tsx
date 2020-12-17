import React, { useState, useEffect } from "react";
import routes from "@/services/routes";
import Router from "./Router";
import handleNavigationIntent from "./handleNavigationIntent";
import ErrorMessage from "./ErrorMessage";

export default function ApplicationArea() {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [unhandledError, setUnhandledError] = useState(null);

  useEffect(() => {
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    if (currentRoute && currentRoute.title) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      document.title = currentRoute.title;
    }
  }, [currentRoute]);

  useEffect(() => {
    function globalErrorHandler(event: any) {
      event.preventDefault();
      setUnhandledError(event.error);
    }

    document.body.addEventListener("click", handleNavigationIntent, false);
    window.addEventListener("error", globalErrorHandler, false);

    return () => {
      document.body.removeEventListener("click", handleNavigationIntent, false);
      window.removeEventListener("error", globalErrorHandler, false);
    };
  }, []);

  if (unhandledError) {
    return <ErrorMessage error={unhandledError} />;
  }

  // @ts-expect-error ts-migrate(2322) FIXME: Type 'RouteItem[]' is not assignable to type '{ pa... Remove this comment to see the full error message
  return <Router routes={routes.items} onRouteChange={setCurrentRoute} />;
}
