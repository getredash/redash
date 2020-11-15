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
      if (event.message === "Uncaught SyntaxError: Unexpected token '<'") {
        // if we see a javascript error on unexpected token where the unexpected token is '<', this usually means that a fallback html file (like index.html)
        // was served as content of script rather than the expected script, give a friendlier message in the console on what could be going on
        console.error(
          `[Uncaught SyntaxError: Unexpected token '<'] usually means that a fallback html file was returned from server rather than the expected script. Check that the server is properly serving the file ${event.filename}.`
        );
      }
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
