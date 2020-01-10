import React, { useState, useEffect } from "react";
import ApplicationHeader from "@/components/ApplicationHeader";

import routes from "@/pages";

import Router from "./Router";
import handleNavigationIntent from "./handleNavigationIntent";

const layouts = {
  default: {
    showHeader: true,
    bodyClass: false,
  },
  fixed: {
    showHeader: true,
    bodyClass: "fixed-layout",
  },
  defaultSignedOut: {
    showHeader: false,
  },
};

function selectLayout(route) {
  let layout = layouts.default;
  if (route.layout) {
    layout = layouts[route.layout] || layouts.default;
  } else if (!route.authenticated) {
    layout = layouts.defaultSignedOut;
  }
  return layout;
}

export default function ApplicationArea() {
  const [showHeader, setShowHeader] = useState(false);

  // TODO: This is needed to refresh header when route changes
  // Better solution is either to move header to each page or create some global state for currentUser/clientConfig/etc.
  const [currentRoute, setCurrentRoute] = useState(null);

  useEffect(() => {
    const route = currentRoute || { authenticated: true };

    if (route.title) {
      document.title = route.title;
    }

    const layout = selectLayout(route);
    setShowHeader(layout.showHeader);
    if (layout.bodyClass) {
      document.body.classList.toggle(layout.bodyClass, true);
      return () => {
        document.body.classList.toggle(layout.bodyClass, false);
      };
    }
  }, [currentRoute]);

  useEffect(() => {
    document.body.addEventListener("click", handleNavigationIntent, false);

    return () => {
      document.body.removeEventListener("click", handleNavigationIntent, false);
    };
  });

  return (
    <>
      {currentRoute && showHeader && <ApplicationHeader currentRoute={currentRoute} />}
      <Router routes={routes} onRouteChange={setCurrentRoute} />
    </>
  );
}
