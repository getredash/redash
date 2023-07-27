import React, { useState, useEffect } from "react";
import routes from "@/services/routes";
import Router from "./Router";
import handleNavigationIntent from "./handleNavigationIntent";
import ErrorMessage from "./ErrorMessage";

export default function ApplicationArea() {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [unhandledError, setUnhandledError] = useState(null);

  useEffect(() => {
    if (currentRoute && currentRoute.title) {
      document.title = currentRoute.title;
    }
  }, [currentRoute]);

  useEffect(() => {
    function globalErrorHandler(event) {
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

  return <Router routes={routes.items} onRouteChange={setCurrentRoute} />;
}
