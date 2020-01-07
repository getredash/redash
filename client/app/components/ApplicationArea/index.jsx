import React, { useState, useCallback } from "react";
import ApplicationHeader from "@/components/ApplicationHeader";

import Router from "./Router";

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

  const handleRouteChange = useCallback(route => {
    const layout = selectLayout(route);
    setShowHeader(layout.showHeader);
    document.body.className = layout.bodyClass;
    if (route.title) {
      document.title = route.title;
    }
  }, []);

  return (
    <div>
      {showHeader && <ApplicationHeader />}
      <Router onRouteChange={handleRouteChange} />
    </div>
  );
}
